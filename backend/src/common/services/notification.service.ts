import { Injectable, Logger } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { EmailService } from './email.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly telegramService: TelegramService,
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
  ) {}

  /** Notify an eligible tasker that a new job matching their services was posted. */
  async notifyTaskerNewJob(taskerId: string, job: any) {
    const provider = await this.prisma.provider.findUnique({
      where: { userId: taskerId },
      include: { user: true },
    });

    if (!provider?.user.telegramId) return;

    // Use rich job alert with inline keyboard action buttons
    await this.telegramService.sendJobAlert(provider.user.telegramId, job).catch((err) => {
      this.logger.warn(`Telegram job alert failed for ${taskerId}: ${(err as Error).message}`);
    });

    this.logger.log(`Telegram job alert sent to tasker ${taskerId}`);
  }

  /** Notify a tasker that they have been selected by the client. */
  async notifyTaskerSelected(taskerId: string, job: any) {
    const provider = await this.prisma.provider.findUnique({
      where: { userId: taskerId },
      include: { user: true },
    });

    if (!provider) return;

    const frontendUrl = process.env.FRONTEND_URL ?? 'https://www.quebec-emplois.ca';
    const taskUrl = `${frontendUrl}/jobs/${job.id}`;
    
    // 1. Send Email Notification
    const emailSubject = `🎉 Félicitations ! Vous avez été sélectionné pour : ${job.title}`;
    const emailHtml = `
      <div style="font-family: sans-serif; color: #152332; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #b87b44;">Vous avez été sélectionné !</h2>
        <p>Bonjour ${provider.user.firstName || 'Travailleur'},</p>
        <p>Bonne nouvelle ! Le client vous a choisi pour la tâche suivante :</p>
        <div style="background: #f4f6f8; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <strong>${job.title}</strong>
        </div>
        <p>Les coordonnées du client (nom et téléphone) sont maintenant visibles dans les détails de la tâche. Assurez-vous de le contacter rapidement pour confirmer les détails !</p>
        <a href="${taskUrl}" style="display: inline-block; background-color: #b87b44; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">Voir les détails de la tâche</a>
      </div>
    `;
    
    await this.emailService.sendEmail(provider.user.email, emailSubject, emailHtml);

    // 2. Send Telegram Notification (if linked)
    if (provider.user.telegramId) {
      const message =
        `🎉 <b>Félicitations ! Tu as été sélectionné.</b>\n\n` +
        `Le client t'a choisi pour :\n<b>${job.title}</b>\n\n` +
        `Son nom et numéro de téléphone sont maintenant visibles dans la tâche.\n\n` +
        `<a href="${taskUrl}">Voir la tâche →</a>`;

      await this.telegramService.sendMessage(provider.user.telegramId, message).catch((err) => {
        this.logger.warn(`Telegram selection notification failed for ${taskerId}: ${(err as Error).message}`);
      });
    }
  }

  /** Notify a user (client or tasker) that they received a message while offline. */
  async notifyOfflineMessage(recipientId: string, senderName: string, messagePreview: string, conversationId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: recipientId },
    });

    if (!user) return;

    const frontendUrl = process.env.FRONTEND_URL ?? 'https://www.quebec-emplois.ca';
    const chatUrl = `${frontendUrl}/messages`;

    // 1. Send Email Notification
    const emailSubject = `Nouveau message de ${senderName} sur Q-Emplois`;
    const emailHtml = `
      <div style="font-family: sans-serif; color: #152332; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #b87b44;">Nouveau message</h2>
        <p>Bonjour ${user.firstName || ''},</p>
        <p>Vous avez reçu un nouveau message de <strong>${senderName}</strong> :</p>
        <div style="background: #f4f6f8; padding: 15px; border-left: 4px solid #b87b44; border-radius: 0 8px 8px 0; margin: 15px 0; font-style: italic;">
          "${messagePreview.length > 100 ? messagePreview.substring(0, 100) + '...' : messagePreview}"
        </div>
        <a href="${chatUrl}" style="display: inline-block; background-color: #b87b44; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">Répondre au message</a>
      </div>
    `;

    await this.emailService.sendEmail(user.email, emailSubject, emailHtml);

    // 2. Send Telegram Notification (if linked)
    if (user.telegramId) {
      const tgMessage =
        `💬 <b>Nouveau message de ${senderName}</b>\n\n` +
        `<i>"${messagePreview.length > 50 ? messagePreview.substring(0, 50) + '...' : messagePreview}"</i>\n\n` +
        `<a href="${chatUrl}">Ouvrir le chat →</a>`;

      await this.telegramService.sendMessage(user.telegramId, tgMessage).catch((err) => {
        this.logger.warn(`Telegram offline message notification failed for ${recipientId}: ${(err as Error).message}`);
      });
    }
  }
}

