import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';
import { TelegramService } from './telegram.service';

/**
 * Background jobs that keep verification state healthy:
 *
 * 0. Morning digest (08:00 ET): all pending ID reviews → ADMIN_EMAIL
 *    (+ optional TELEGRAM_ADMIN_CHAT_ID). Soft-launch critical path.
 *
 * 1. Stale-pending alert (10:00 ET): taskers + admin if waiting >48h.
 *
 * 2. Verification expiry (03:00 ET): flip isVerified=false after TTL.
 *
 * 3. Stale jobs (09:00 ET): clients with open jobs, 0 applications, 7d+.
 */
@Injectable()
export class VerificationJobsService {
  private readonly logger = new Logger(VerificationJobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
    private readonly telegram: TelegramService,
  ) {}

  private adminEmail(): string {
    return this.config.get<string>('ADMIN_EMAIL') || 'admin@qemplois.ca';
  }

  private adminUrl(): string {
    const base =
      this.config.get<string>('FRONTEND_URL') ||
      'https://www.quebec-emplois.ca';
    return `${base.replace(/\/$/, '')}/admin`;
  }

  private digestEnabled(): boolean {
    return this.config.get('VERIFICATION_DIGEST_ENABLED', 'true') !== 'false';
  }

  /**
   * Load pending providers (ID uploaded, not verified).
   * Excludes pure rejects without a new document (licenseDocumentUrl null).
   */
  async listPendingForDigest() {
    const rows = await this.prisma.provider.findMany({
      where: {
        licenseDocumentUrl: { not: null },
        isVerified: false,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { updatedAt: 'asc' },
    });

    const now = Date.now();
    return rows.map((p) => {
      const hoursWaiting = Math.max(
        0,
        Math.floor((now - p.updatedAt.getTime()) / (60 * 60 * 1000)),
      );
      const taskerName =
        [p.user.firstName, p.user.lastName].filter(Boolean).join(' ') ||
        p.user.email;
      return {
        providerId: p.id,
        userId: p.user.id,
        taskerName,
        taskerEmail: p.user.email,
        serviceTypes: p.serviceTypes ?? [],
        pendingSince: p.updatedAt.toISOString(),
        hoursWaiting,
        firstName: p.user.firstName,
      };
    });
  }

  /**
   * Send morning digest (email + optional Telegram). Callable from cron or admin API.
   */
  async sendPendingDigest(options?: {
    force?: boolean;
  }): Promise<{ sent: boolean; count: number; overdue: number }> {
    if (!this.digestEnabled() && !options?.force) {
      this.logger.log('Verification digest disabled (VERIFICATION_DIGEST_ENABLED=false).');
      return { sent: false, count: 0, overdue: 0 };
    }

    const pending = await this.listPendingForDigest();
    if (pending.length === 0) {
      this.logger.log('No pending verifications — digest skipped.');
      return { sent: false, count: 0, overdue: 0 };
    }

    const overdue = pending.filter((p) => p.hoursWaiting >= 48).length;
    const adminEmail = this.adminEmail();
    const adminUrl = this.adminUrl();

    await this.email.sendAdminPendingDigest(
      adminEmail,
      pending.map((p) => ({
        providerId: p.providerId,
        taskerName: p.taskerName,
        taskerEmail: p.taskerEmail,
        serviceTypes: p.serviceTypes,
        pendingSince: p.pendingSince,
        hoursWaiting: p.hoursWaiting,
      })),
      adminUrl,
    );

    const chatId = this.config.get<string>('TELEGRAM_ADMIN_CHAT_ID');
    if (chatId && this.telegram.isConfigured()) {
      const lines = pending
        .slice(0, 15)
        .map(
          (p) =>
            `• <b>${p.taskerName}</b> (${p.hoursWaiting}h)${p.hoursWaiting >= 48 ? ' ⚠' : ''}`,
        )
        .join('\n');
      const more =
        pending.length > 15 ? `\n… +${pending.length - 15} autre(s)` : '';
      await this.telegram.sendMessage(
        chatId,
        `🔔 <b>Digest vérifications</b>\n${pending.length} en attente` +
          (overdue ? ` · ${overdue} >48h` : '') +
          `\n\n${lines}${more}\n\n<a href="${adminUrl}">Ouvrir l'admin</a>`,
      );
    }

    this.logger.log(
      `Pending verification digest sent: count=${pending.length} overdue=${overdue} to=${adminEmail}`,
    );
    return { sent: true, count: pending.length, overdue };
  }

  /** Daily at 08:00 AM Eastern — full pending queue digest for soft-launch SLA. */
  @Cron('0 8 * * *', { timeZone: 'America/Toronto' })
  async handleMorningPendingDigest(): Promise<void> {
    try {
      await this.sendPendingDigest();
    } catch (err) {
      this.logger.error(
        `Morning verification digest failed: ${(err as Error).message}`,
      );
    }
  }

  /** Daily at 10:00 AM Eastern (matches Quebec business hours). */
  @Cron('0 10 * * *', { timeZone: 'America/Toronto' })
  async handleStalePendingVerifications(): Promise<void> {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const stale = await this.prisma.provider.findMany({
      where: {
        licenseDocumentUrl: { not: null },
        isVerified: false,
        updatedAt: { lt: cutoff },
      },
      include: {
        user: { select: { email: true, firstName: true, id: true } },
      },
    });

    if (stale.length === 0) {
      this.logger.log('No stale pending verifications.');
      return;
    }

    this.logger.warn(
      `Found ${stale.length} stale pending verification(s) (>48h).`,
    );

    const adminEmail = this.adminEmail();
    const adminUrl = this.adminUrl();

    for (const provider of stale) {
      await this.audit.log({
        userId: provider.user.id,
        action: 'verification_stale_pending_alert',
        resource: 'provider',
        resourceId: provider.id,
        details: { pendingSince: provider.updatedAt.toISOString() },
      });

      if (provider.user.email) {
        try {
          await this.email.sendStaleVerificationNotice(
            provider.user.email,
            provider.user.firstName,
          );
        } catch (err) {
          this.logger.error(
            `Failed to email tasker ${provider.id}: ${(err as Error).message}`,
          );
        }
      }
    }

    try {
      await this.email.sendAdminStaleDigest(
        adminEmail,
        stale.map((p) => ({
          providerId: p.id,
          taskerName: p.user.firstName ?? p.user.email,
          taskerEmail: p.user.email,
          pendingSince: p.updatedAt.toISOString(),
        })),
        adminUrl,
      );
    } catch (err) {
      this.logger.error(
        `Failed to email admin digest: ${(err as Error).message}`,
      );
    }
  }

  /** Daily at 9:00 AM Eastern — stale jobs with 0 applications */
  @Cron('0 9 * * *', { timeZone: 'America/Toronto' })
  async handleStaleJobs(): Promise<void> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const staleJobs = await this.prisma.task.findMany({
      where: {
        status: 'open',
        createdAt: { lte: sevenDaysAgo },
        applications: { none: {} },
      },
      include: {
        client: { select: { email: true, firstName: true } },
      },
    });

    if (staleJobs.length === 0) {
      this.logger.log('No stale jobs with 0 applications.');
      return;
    }

    this.logger.log(`Found ${staleJobs.length} stale job(s) with 0 applications.`);
    for (const job of staleJobs) {
      if (job.client.email) {
        await this.email.send({
          to: job.client.email,
          subject: `Votre tâche « ${job.title} » n'a pas reçu de candidature`,
          html: `<p>Bonjour ${job.client.firstName ?? ''},</p>
<p>Votre tâche « ${job.title} » a été publiée il y a plus d'une semaine mais n'a reçu aucune candidature.</p>
<p>Suggestions pour attirer des travailleurs :</p>
<ul>
<li>Vérifier que le prix estimé est compétitif</li>
<li>Ajouter des photos pour donner plus de détails</li>
<li>Élargir le rayon de recherche</li>
</ul>
<p><a href="${this.config.get('FRONTEND_URL', 'http://localhost:5173')}/jobs/${job.id}">Modifier ma tâche</a></p>
<p>— Q-Emplois</p>`,
        });
      }
    }
  }
  /** Daily at 3:00 AM ET — flip expired verifications */
  @Cron('0 3 * * *', { timeZone: 'America/Toronto' })
  async handleVerificationExpiry(): Promise<void> {
    const now = new Date();
    const expired = await this.prisma.provider.findMany({
      where: {
        isVerified: true,
        verificationExpiresAt: { lt: now },
      },
      include: {
        user: { select: { id: true, email: true, firstName: true } },
      },
    });

    if (expired.length === 0) {
      this.logger.log('No expired verifications to flip.');
      return;
    }

    this.logger.warn(
      `Expiring verification for ${expired.length} provider(s).`,
    );

    for (const provider of expired) {
      await this.prisma.provider.update({
        where: { id: provider.id },
        data: {
          isVerified: false,
          verificationExpiresAt: null,
          // Keep verifiedAt/verifiedBy as historical record of last approval.
        },
      });

      await this.audit.log({
        userId: provider.user.id,
        action: 'verification_expired',
        resource: 'provider',
        resourceId: provider.id,
        details: {
          previouslyVerifiedAt: provider.verifiedAt?.toISOString() ?? null,
        },
      });

      if (provider.user.email) {
        try {
          await this.email.sendVerificationExpiredNotice(
            provider.user.email,
            provider.user.firstName,
          );
        } catch (err) {
          this.logger.error(
            `Failed to email tasker about expiry ${provider.id}: ${(err as Error).message}`,
          );
        }
      }
    }
  }
}