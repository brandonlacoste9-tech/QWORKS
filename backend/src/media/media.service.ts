import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { StorageService } from '../common/storage/storage.service';
import { EmailService } from '../common/email/email.service';
import { UploadImageDto } from './media.dto';

@Injectable()
export class MediaService {
  constructor(
    private readonly storageService: StorageService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async upload(userId: string, dto: UploadImageDto) {
    const { buffer, contentType } = this.storageService.parseUploadPayload(dto.data, dto.contentType);

    if (dto.purpose === 'avatar') {
      const url = await this.storageService.uploadAvatar(userId, buffer, dto.filename, contentType);
      await this.prisma.user.update({
        where: { id: userId },
        data: { avatarUrl: url },
      });
      return { url, purpose: 'avatar' };
    }

    if (dto.purpose === 'message') {
      const url = await this.storageService.uploadMessagePhoto(userId, buffer, dto.filename, contentType);
      return { url, purpose: 'message' };
    }

    const url = await this.storageService.uploadTaskPhoto(userId, buffer, dto.filename, contentType);
    return { url, purpose: 'task' };
  }

  /** Multipart upload — buffer comes directly from Multer, no base64 overhead */
  async uploadFile(userId: string, file: Express.Multer.File, purpose: 'avatar' | 'task' | 'document' | 'message') {
    if (purpose === 'avatar') {
      const url = await this.storageService.uploadAvatar(
        userId,
        file.buffer,
        file.originalname,
        file.mimetype,
      );
      await this.prisma.user.update({
        where: { id: userId },
        data: { avatarUrl: url },
      });
      return { url, purpose: 'avatar' };
    }

    if (purpose === 'document') {
      const url = await this.storageService.uploadProviderDocument(
        userId,
        file.buffer,
        file.originalname,
        file.mimetype,
      );
      await this.prisma.provider.upsert({
        where: { userId },
        create: { userId, serviceTypes: [], licenseDocumentUrl: url, isVerified: false },
        update: {
          licenseDocumentUrl: url,
          isVerified: false,
          verifiedAt: null,
          rejectedAt: null,
          rejectionReason: null,
        },
      });

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true, lastName: true },
      });
      if (user?.email) {
        await this.emailService.sendVerificationReceived(user.email, user.firstName);
        const adminEmail =
          this.configService.get<string>('ADMIN_EMAIL') || 'admin@qemplois.ca';
        const frontendUrl =
          this.configService.get<string>('FRONTEND_URL') ||
          'https://www.quebec-emplois.ca';
        const taskerName =
          [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
        const providerRow = await this.prisma.provider.findUnique({
          where: { userId },
          select: { serviceTypes: true },
        });
        await this.emailService.sendVerificationPendingAdmin(
          adminEmail,
          taskerName,
          user.email,
          `${frontendUrl.replace(/\/$/, '')}/admin`,
          providerRow?.serviceTypes,
        );
      }

      return { url, purpose: 'document' };
    }

    if (purpose === 'message') {
      const url = await this.storageService.uploadMessagePhoto(
        userId,
        file.buffer,
        file.originalname,
        file.mimetype,
      );
      return { url, purpose: 'message' };
    }

    const url = await this.storageService.uploadTaskPhoto(
      userId,
      file.buffer,
      file.originalname,
      file.mimetype,
    );
    return { url, purpose: 'task' };
  }
}
