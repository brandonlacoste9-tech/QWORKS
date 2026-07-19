import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreditsService } from '../credits/credits.service';
import { StorageService } from '../common/storage/storage.service';
import { EmailService } from '../common/email/email.service';
import { TelegramService } from '../common/services/telegram.service';
import { geocodeQuebecAddress } from '../common/utils/geocode';
import { validateRBQLicense } from '../common/utils/rbq-validation';

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function mapBrowseResult(
  provider: {
    userId: string;
    serviceTypes: string[];
    rating: number;
    reviewCount: number;
    isVerified: boolean;
    licenseDocumentUrl: string | null;
    hourlyRate: unknown;
    locationAddress: string | null;
    locationLat: unknown;
    locationLng: unknown;
    verificationExpiresAt: Date | null;
    rejectedAt: Date | null;
    user: { id: string; firstName: string | null; lastName: string | null; avatarUrl: string | null; createdAt: Date };
  },
  distanceKm?: number,
) {
  const status = provider.isVerified && provider.verificationExpiresAt && provider.verificationExpiresAt < new Date()
    ? 'expired'
    : provider.isVerified
    ? 'verified'
    : provider.rejectedAt
    ? 'rejected'
    : provider.licenseDocumentUrl
    ? 'pending'
    : 'unverified';
  return {
    id: provider.user.id,
    firstName: provider.user.firstName,
    lastName: provider.user.lastName,
    avatar: provider.user.avatarUrl ?? undefined,
    serviceTypes: provider.serviceTypes,
    rating: provider.rating,
    reviewCount: provider.reviewCount,
    isVerified: provider.isVerified,
    verificationStatus: status,
    hourlyRate: provider.hourlyRate ? Number(provider.hourlyRate) : undefined,
    city: provider.locationAddress,
    memberSince: provider.user.createdAt.toISOString(),
    distanceKm: distanceKm != null ? Math.round(distanceKm * 10) / 10 : undefined,
  };
}

export interface UpsertProviderDto {
  serviceTypes: string[];
  hourlyRate?: number;
  serviceRadiusKm?: number;
  licenseNumber?: string;
  licenseDocumentUrl?: string;
  locationAddress?: string;
  locationLat?: number;
  locationLng?: number;
}

@Injectable()
export class ProvidersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly creditsService: CreditsService,
    private readonly storageService: StorageService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly telegramService: TelegramService,
  ) {}

  async upsertForUser(userId: string, dto: UpsertProviderDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur non trouvé.');

    if (dto.licenseNumber && !validateRBQLicense(dto.licenseNumber)) {
      throw new BadRequestException('Numéro de licence RBQ invalide. Format accepté : 1234-5678-90 ou 12345.');
    }

    let locationLat = dto.locationLat;
    let locationLng = dto.locationLng;
    if ((locationLat == null || locationLng == null) && dto.locationAddress) {
      const coords = geocodeQuebecAddress(dto.locationAddress);
      if (coords) {
        locationLat = coords.lat;
        locationLng = coords.lng;
      }
    }

    const provider = await this.prisma.provider.upsert({
      where: { userId },
      create: {
        userId,
        serviceTypes: dto.serviceTypes,
        hourlyRate: dto.hourlyRate,
        serviceRadiusKm: dto.serviceRadiusKm ?? 25,
        licenseNumber: dto.licenseNumber,
        licenseDocumentUrl: dto.licenseDocumentUrl,
        locationAddress: dto.locationAddress,
        locationLat,
        locationLng,
      },
      update: {
        serviceTypes: dto.serviceTypes,
        hourlyRate: dto.hourlyRate,
        serviceRadiusKm: dto.serviceRadiusKm,
        licenseNumber: dto.licenseNumber,
        licenseDocumentUrl: dto.licenseDocumentUrl,
        locationAddress: dto.locationAddress,
        locationLat,
        locationLng,
      },
    });

    await this.creditsService.maybeGrantFoundingTaskerBonus(userId);

    return provider;
  }

  async findByUserId(userId: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });
    if (!provider) throw new NotFoundException('Profil prestataire non trouvé.');
    return {
      ...provider,
      verificationExpiresAt:
        provider.verificationExpiresAt?.toISOString() ?? null,
    };
  }

  async search(serviceType?: string, city?: string, postalCode?: string, verifiedOnly?: boolean) {
    const providers = await this.prisma.provider.findMany({
      where: {
        // Include all providers except those with expired verification
        NOT: {
          isVerified: true,
          verificationExpiresAt: { lte: new Date() },
        },
        ...(verifiedOnly ? { isVerified: true } : {}),
        serviceTypes: { isEmpty: false },
        ...(serviceType ? { serviceTypes: { has: serviceType } } : {}),
        ...(city
          ? {
              locationAddress: { contains: city, mode: 'insensitive' as const },
            }
          : {}),
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, createdAt: true },
        },
      },
      take: 50,
    });

    const origin = geocodeQuebecAddress(city, postalCode);
    const withDistance = providers.map((p) => {
      let distanceKm: number | undefined;
      if (
        origin &&
        p.locationLat != null &&
        p.locationLng != null
      ) {
        distanceKm = haversineKm(
          origin.lat,
          origin.lng,
          Number(p.locationLat),
          Number(p.locationLng),
        );
      }
      return { provider: p, distanceKm };
    });

    withDistance.sort((a, b) => {
      const statusOrder: Record<string, number> = { verified: 0, pending: 1, unverified: 2, rejected: 3, expired: 4 };
      const aStatus = mapBrowseResult(a.provider).verificationStatus;
      const bStatus = mapBrowseResult(b.provider).verificationStatus;
      if (aStatus !== bStatus) return (statusOrder[aStatus] ?? 0) - (statusOrder[bStatus] ?? 0);
      if (a.provider.rating !== b.provider.rating) return b.provider.rating - a.provider.rating;
      if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm;
      return b.provider.reviewCount - a.provider.reviewCount;
    });

    const radius = 50;
    return withDistance
      .filter((row) => row.distanceKm == null || row.distanceKm <= radius)
      .slice(0, 24)
      .map((row) => mapBrowseResult(row.provider, row.distanceKm));
  }

  async getPublicProfile(userId: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            createdAt: true,
          },
        },
      },
    });
    if (!provider) throw new NotFoundException('Profil prestataire non trouvé.');
    if (!provider.isVerified) {
      throw new NotFoundException('Profil prestataire non trouvé.');
    }

    const claimedCount = await this.prisma.task.count({
      where: { taskerId: userId, status: { in: ['claimed', 'in_progress', 'completed'] } }
    });
    const completedCount = await this.prisma.task.count({
      where: { taskerId: userId, status: 'completed' }
    });
    const completionRate = claimedCount > 0 ? Math.round((completedCount / claimedCount) * 100) : null;

    const applications = await this.prisma.taskApplication.findMany({
      where: { taskerId: userId },
      select: { createdAt: true, task: { select: { createdAt: true } } }
    });
    
    let responseTimeMins: number | null = null;
    if (applications.length > 0) {
      const totalMs = applications.reduce((acc, app) => {
        const diff = app.createdAt.getTime() - app.task.createdAt.getTime();
        return acc + Math.max(0, diff); // ensure no negative times
      }, 0);
      responseTimeMins = Math.round(totalMs / applications.length / 1000 / 60);
    }

    return {
      id: provider.user.id,
      firstName: provider.user.firstName,
      lastName: provider.user.lastName,
      avatar: provider.user.avatarUrl ?? undefined,
      serviceTypes: provider.serviceTypes,
      rating: provider.rating,
      reviewCount: provider.reviewCount,
      isVerified: provider.isVerified,
      hourlyRate: provider.hourlyRate ? Number(provider.hourlyRate) : undefined,
      city: provider.locationAddress,
      memberSince: provider.user.createdAt.toISOString(),
      completionRate,
      responseTimeMins,
    };
  }

  async uploadLicenseDocument(
    userId: string,
    dto: { data: string; filename: string; contentType: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur non trouvé.');

    let buffer: Buffer;
    let contentType = dto.contentType || 'application/octet-stream';
    if (dto.data.startsWith('data:')) {
      const match = dto.data.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) throw new BadRequestException('Format de fichier invalide.');
      contentType = match[1];
      buffer = Buffer.from(match[2], 'base64');
    } else {
      buffer = Buffer.from(dto.data, 'base64');
    }

    const url = await this.storageService.uploadProviderDocument(
      userId,
      buffer,
      dto.filename || 'document',
      contentType,
    );

    await this.prisma.provider.upsert({
      where: { userId },
      create: {
        userId,
        serviceTypes: [],
        licenseDocumentUrl: url,
        isVerified: false,
      },
      update: {
        licenseDocumentUrl: url,
        isVerified: false,
        verifiedAt: null,
        rejectedAt: null,
        rejectionReason: null,
      },
    });

    await this.emailService.sendVerificationReceived(user.email, user.firstName);

    const adminEmail =
      this.configService.get<string>('ADMIN_EMAIL') || 'admin@qemplois.ca';
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      'https://www.quebec-emplois.ca';
    const taskerName =
      [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
    const provider = await this.prisma.provider.findUnique({
      where: { userId },
      select: { serviceTypes: true },
    });
    const adminPage = `${frontendUrl.replace(/\/$/, '')}/admin`;
    await this.emailService.sendVerificationPendingAdmin(
      adminEmail,
      taskerName,
      user.email,
      adminPage,
      provider?.serviceTypes,
    );

    const adminChat = this.configService.get<string>('TELEGRAM_ADMIN_CHAT_ID');
    if (adminChat && this.telegramService.isConfigured()) {
      const services =
        provider?.serviceTypes?.length
          ? provider.serviceTypes.join(', ')
          : '—';
      await this.telegramService.sendMessage(
        adminChat,
        `🔔 <b>ID à vérifier</b>\n${taskerName} (${user.email})\nServices: ${services}\n<a href="${adminPage}">Ouvrir l'admin</a>`,
      );
    }

    return { licenseDocumentUrl: url };
  }
}