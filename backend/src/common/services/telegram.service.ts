import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreditsService } from '../../credits/credits.service';
import { CreditTransactionType, TaskApplicationStatus, TaskStatus } from '@prisma/client';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly botToken: string | null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly creditsService: CreditsService,
  ) {
    this.botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN') ?? null;
  }

  isConfigured(): boolean {
    return !!this.botToken;
  }

  // ─────────────────────────────────────────────────────────
  // Core send methods
  // ─────────────────────────────────────────────────────────

  async sendMessage(chatId: string, text: string, extra?: Record<string, unknown>): Promise<boolean> {
    if (!this.botToken) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not set — skipping telegram message');
      return false;
    }
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${this.botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            ...extra,
          }),
        },
      );
      if (!res.ok) {
        const body = await res.text();
        this.logger.error(`Telegram API error (${res.status}): ${body}`);
        return false;
      }
      return true;
    } catch (err) {
      this.logger.error('Telegram send failed:', err);
      return false;
    }
  }

  private async answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
    if (!this.botToken) return;
    try {
      await fetch(`https://api.telegram.org/bot${this.botToken}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: false }),
      });
    } catch {
      // best-effort
    }
  }

  // ─────────────────────────────────────────────────────────
  // Rich job alert with inline keyboard
  // ─────────────────────────────────────────────────────────

  async sendJobAlert(
    chatId: string,
    job: {
      id: string;
      title: string;
      description: string;
      serviceType: string;
      city?: string | null;
      estimatedPrice: unknown;
      scheduledDate?: Date | null;
    },
  ): Promise<boolean> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? 'https://www.quebec-emplois.ca';
    const price = Number(job.estimatedPrice ?? 0);
    const city = job.city ?? 'Non spécifié';
    const date = job.scheduledDate
      ? new Date(job.scheduledDate).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long' })
      : 'À convenir';

    const SERVICE_LABELS: Record<string, string> = {
      demenagement: '🚚 Déménagement',
      menage: '🧹 Ménage',
      montage_meubles: '🪚 Montage meubles',
      nettoyage: '🧽 Nettoyage',
      jardinage: '🌿 Jardinage',
      livraison: '📦 Livraison',
      coursier: '🛵 Coursier',
      autre: '🔧 Autre',
    };
    const serviceLabel = SERVICE_LABELS[job.serviceType] ?? job.serviceType;

    const text =
      `🆕 <b>Nouvelle tâche disponible !</b>\n\n` +
      `📌 <b>${job.title}</b>\n` +
      `${serviceLabel} · ${city} · ${date}\n` +
      `💰 <b>${price > 0 ? `~${price} $` : 'Prix à négocier'}</b>\n\n` +
      `📝 ${job.description.slice(0, 200)}${job.description.length > 200 ? '…' : ''}\n\n` +
      `<i>Tap Postuler pour candidater (1 crédit).</i>`;

    const inline_keyboard = [
      [
        { text: '✅ Postuler (1 crédit)', callback_data: `APPLY_${job.id}` },
        { text: '❌ Passer', callback_data: `PASS_${job.id}` },
      ],
      [
        { text: '🔗 Voir la tâche', url: `${frontendUrl}/jobs/${job.id}` },
      ],
    ];

    return this.sendMessage(chatId, text, { reply_markup: { inline_keyboard } });
  }

  // ─────────────────────────────────────────────────────────
  // Deep-link helper
  // ─────────────────────────────────────────────────────────

  getBotLink(userId: string): string | null {
    const botUsername = this.configService.get<string>('TELEGRAM_BOT_USERNAME');
    if (!botUsername) return null;
    return `https://t.me/${botUsername}?start=link_${userId}`;
  }

  // ─────────────────────────────────────────────────────────
  // Incoming update dispatcher
  // ─────────────────────────────────────────────────────────

  async processUpdate(update: Record<string, unknown>): Promise<{ ok: boolean }> {
    // Handle inline keyboard button taps
    const callbackQuery = (update as any).callback_query;
    if (callbackQuery) {
      await this.handleCallbackQuery(callbackQuery);
      return { ok: true };
    }

    // Handle text messages
    const message = (update as any).message;
    if (!message?.text || !message?.chat?.id) {
      return { ok: true }; // non-message updates ignored
    }

    const chatId = String(message.chat.id);
    const text = String(message.text).trim();
    const firstName = message.from?.first_name ?? '';

    // /start link_<userId>
    const startMatch = text.match(/^\/start\s+link_([a-zA-Z0-9-]+)/);
    if (startMatch) {
      await this.handleLink(chatId, startMatch[1], firstName);
      return { ok: true };
    }

    // /stop or /unlink
    if (text === '/stop' || text === '/unlink') {
      await this.handleStop(chatId);
      return { ok: true };
    }

    // /aide or /help
    if (text === '/aide' || text === '/help') {
      await this.sendMessage(
        chatId,
        `🤖 <b>Commandes Q-Emplois</b>\n\n` +
        `/start — Lier ton compte\n` +
        `/stop — Désactiver les notifications\n` +
        `/aide — Afficher cette aide\n\n` +
        `Pour de l'aide: <a href="mailto:aide@q-emplois.ca">aide@q-emplois.ca</a>`,
      );
      return { ok: true };
    }

    // /start without param
    if (text === '/start') {
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? 'https://www.quebec-emplois.ca';
      await this.sendMessage(
        chatId,
        `👋 <b>Bienvenue sur Q-Emplois !</b>\n\n` +
        `Pour recevoir des alertes de tâches, lie ton compte :\n\n` +
        `1. Va sur <a href="${frontendUrl}/profile">${frontendUrl}/profile</a>\n` +
        `2. Clique sur <b>Connecter Telegram</b>\n\n` +
        `Commandes: /aide`,
      );
      return { ok: true };
    }

    // Unknown
    await this.sendMessage(
      chatId,
      `❓ Commande inconnue. Tape /aide pour voir les commandes disponibles.`,
    );
    return { ok: true };
  }

  // ─────────────────────────────────────────────────────────
  // Command handlers
  // ─────────────────────────────────────────────────────────

  private async handleLink(chatId: string, userId: string, firstName: string): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        await this.sendMessage(chatId, `❌ Lien invalide. Aucun compte trouvé.`);
        return;
      }

      // Already linked to this user
      if (user.telegramId === chatId) {
        await this.sendMessage(
          chatId,
          `✅ <b>Ton compte est déjà lié, ${firstName} !</b>\n\nTu reçois déjà les notifications Q-Emplois ici.\n\n/stop pour désactiver.`,
        );
        return;
      }

      // Linked to a different account
      const existing = await this.prisma.user.findUnique({ where: { telegramId: chatId } });
      if (existing && existing.id !== userId) {
        await this.sendMessage(
          chatId,
          `❌ Ce compte Telegram est déjà lié à un autre utilisateur Q-Emplois.\n\nEnvoie /stop pour délier d'abord.`,
        );
        return;
      }

      await this.prisma.user.update({
        where: { id: userId },
        data: { telegramId: chatId },
      });

      await this.sendMessage(
        chatId,
        `✅ <b>Compte lié avec succès, ${firstName} !</b>\n\n` +
        `Tu recevras maintenant tes alertes Q-Emplois ici en temps réel.\n\n` +
        `Quand une tâche correspond à tes services, tu recevras un message avec les boutons :\n` +
        `• <b>Postuler</b> — candidater en 1 tap (1 crédit)\n` +
        `• <b>Passer</b> — ignorer\n\n` +
        `📌 /stop pour désactiver.`,
      );
      this.logger.log(`Telegram linked: user=${userId} chatId=${chatId}`);
    } catch (err) {
      this.logger.error('Telegram link error:', err);
      await this.sendMessage(chatId, `❌ Erreur lors de la liaison. Réessaye plus tard.`);
    }
  }

  private async handleStop(chatId: string): Promise<void> {
    const user = await this.prisma.user.findFirst({ where: { telegramId: chatId } });
    if (user) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { telegramId: null },
      });
      await this.sendMessage(
        chatId,
        `🔕 Notifications désactivées.\n\nPour réactiver, visite ton profil Q-Emplois et clique sur <b>Connecter Telegram</b>.`,
      );
    } else {
      await this.sendMessage(chatId, `Aucun compte Q-Emplois lié à ce chat.`);
    }
  }

  // ─────────────────────────────────────────────────────────
  // Inline keyboard callback handler
  // ─────────────────────────────────────────────────────────

  private async handleCallbackQuery(callbackQuery: any): Promise<void> {
    const callbackQueryId = callbackQuery.id as string;
    const chatId = String(callbackQuery.message?.chat?.id);
    const data = String(callbackQuery.data ?? '');

    if (!chatId || !data) {
      await this.answerCallbackQuery(callbackQueryId);
      return;
    }

    if (data.startsWith('APPLY_')) {
      const taskId = data.slice(6);
      await this.handleApply(chatId, taskId, callbackQueryId);
      return;
    }

    if (data.startsWith('PASS_')) {
      await this.answerCallbackQuery(callbackQueryId, '⏭ Tâche ignorée.');
      return;
    }

    await this.answerCallbackQuery(callbackQueryId);
  }

  private async handleApply(chatId: string, taskId: string, callbackQueryId: string): Promise<void> {
    // Look up the user by chatId
    const user = await this.prisma.user.findFirst({
      where: { telegramId: chatId },
      include: { provider: true },
    });

    if (!user) {
      await this.answerCallbackQuery(callbackQueryId, '❌ Compte non lié. Visite ton profil pour connecter Telegram.');
      return;
    }

    // Verify provider eligibility
    const provider = user.provider;
    if (!provider) {
      await this.answerCallbackQuery(callbackQueryId, '❌ Profil travailleur incomplet.');
      await this.sendMessage(chatId, `❌ <b>Profil incomplet</b>\n\nTu dois compléter ton profil travailleur et téléverser une pièce d'identité avant de postuler.`);
      return;
    }
    if (!provider.licenseDocumentUrl) {
      await this.answerCallbackQuery(callbackQueryId, '❌ Téléverse une pièce d\'identité sur ton profil d\'abord.');
      await this.sendMessage(chatId, `❌ <b>Pièce d'identité manquante</b>\n\nTéléverse une pièce d'identité sur ton profil avant de postuler.`);
      return;
    }
    if (!provider.isVerified) {
      await this.answerCallbackQuery(callbackQueryId, '❌ Profil en vérification — patiente encore un peu.');
      await this.sendMessage(chatId, `⏳ <b>Vérification en cours</b>\n\nTon profil est en cours de vérification par notre équipe. Tu pourras postuler une fois approuvé.`);
      return;
    }
    if (provider.verificationExpiresAt && provider.verificationExpiresAt < new Date()) {
      await this.answerCallbackQuery(callbackQueryId, '❌ Vérification expirée. Mets à jour ton profil.');
      await this.sendMessage(chatId, `⚠️ <b>Vérification expirée</b>\n\nTéléverse une nouvelle pièce d'identité sur ton profil pour continuer à postuler.`);
      return;
    }

    // Check task is still open
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      await this.answerCallbackQuery(callbackQueryId, '❌ Tâche introuvable.');
      return;
    }
    if (task.status !== TaskStatus.open) {
      await this.answerCallbackQuery(callbackQueryId, '❌ Cette tâche n\'est plus disponible.');
      await this.sendMessage(chatId, `❌ <b>Tâche non disponible</b>\n\n« ${task.title} » a déjà été attribuée ou annulée.`);
      return;
    }
    if (task.clientId === user.id) {
      await this.answerCallbackQuery(callbackQueryId, '❌ Tu ne peux pas postuler à ta propre tâche.');
      return;
    }

    // Check if already applied
    const existing = await this.prisma.taskApplication.findUnique({
      where: { taskId_taskerId: { taskId, taskerId: user.id } },
    });
    if (existing?.status === TaskApplicationStatus.pending) {
      await this.answerCallbackQuery(callbackQueryId, '⚠️ Tu as déjà postulé à cette tâche.');
      return;
    }
    if (existing?.status === TaskApplicationStatus.selected) {
      await this.answerCallbackQuery(callbackQueryId, '✅ Tu as déjà été choisi pour cette tâche !');
      return;
    }

    // Spend 1 credit
    try {
      await this.creditsService.spendCredit(
        user.id,
        taskId,
        'Candidature via Telegram',
        CreditTransactionType.apply,
      );
    } catch (err: any) {
      const msg = err?.message ?? 'Crédits insuffisants';
      await this.answerCallbackQuery(callbackQueryId, `❌ ${msg}`);
      await this.sendMessage(
        chatId,
        `❌ <b>Crédits insuffisants</b>\n\nAchète un pack de crédits sur ton profil Q-Emplois pour postuler.`,
      );
      return;
    }

    // Create or restore application
    if (existing) {
      await this.prisma.taskApplication.update({
        where: { id: existing.id },
        data: { status: TaskApplicationStatus.pending, message: 'Candidature via Telegram' },
      });
    } else {
      await this.prisma.taskApplication.create({
        data: {
          taskId,
          taskerId: user.id,
          status: TaskApplicationStatus.pending,
          message: 'Candidature via Telegram',
        },
      });
    }

    await this.answerCallbackQuery(callbackQueryId, '✅ Candidature envoyée !');

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? 'https://www.quebec-emplois.ca';
    await this.sendMessage(
      chatId,
      `✅ <b>Candidature envoyée !</b>\n\n` +
      `Tu as postulé pour <b>${task.title}</b>.\n` +
      `1 crédit a été déduit de ton compte.\n\n` +
      `Le client examinera ta candidature et te contactera s'il te choisit.\n\n` +
      `<a href="${frontendUrl}/jobs/${taskId}">Voir la tâche →</a>`,
    );

    this.logger.log(`Telegram apply: user=${user.id} task=${taskId}`);
  }
}