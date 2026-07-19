import type { TradesmanProfile } from '../types';

export type TaskerVerificationStatus =
  | 'verified'
  | 'pending'
  | 'rejected'
  | 'unverified'
  | 'expired';

type VerificationProfile = Pick<
  TradesmanProfile,
  'isVerified' | 'licenseDocument' | 'rejectedAt'
>;

export function getTaskerVerificationStatus(
  profile: VerificationProfile | null | undefined,
  verificationExpiresAt?: string | null,
): TaskerVerificationStatus {
  if (!profile) return 'unverified';
  if (profile.isVerified && verificationExpiresAt) {
    if (new Date(verificationExpiresAt) < new Date()) return 'expired';
  }
  if (profile.isVerified) return 'verified';
  if (profile.rejectedAt) return 'rejected';
  if (profile.licenseDocument) return 'pending';
  return 'unverified';
}

export function canTaskerApply(
  profile: VerificationProfile | null | undefined,
  verificationExpiresAt?: string | null,
): boolean {
  return getTaskerVerificationStatus(profile, verificationExpiresAt) === 'verified';
}

export const VERIFICATION_LABELS: Record<TaskerVerificationStatus, string> = {
  verified: 'Profil vérifié',
  pending: 'En revue',
  rejected: 'Vérification refusée',
  unverified: 'Non vérifié',
  expired: 'Vérification expirée',
};

export const VERIFICATION_HINTS: Record<TaskerVerificationStatus, string> = {
  verified: 'Vous pouvez postuler aux tâches (1 crédit par candidature).',
  pending:
    'Votre pièce d\'identité est en cours de vérification — habituellement sous 24 h en bêta. Vous pouvez poser des questions gratuites aux clients en attendant.',
  rejected:
    'Téléversez un nouveau document sur votre profil pour relancer la vérification. Sans approbation, vous ne pouvez pas postuler.',
  unverified:
    'Téléversez une pièce d\'identité sur votre profil pour postuler. Les crédits Founding ne se dépensent qu\'après approbation.',
  expired:
    'Votre vérification a expiré (12 mois). Téléversez une nouvelle pièce d\'identité pour continuer à postuler.',
};

/** Soft-launch CTA label for blocked apply states */
export const VERIFICATION_CTA: Record<TaskerVerificationStatus, string> = {
  verified: 'Voir les jobs',
  pending: 'Voir mon profil',
  rejected: 'Nouveau document',
  unverified: 'Téléverser mon ID',
  expired: 'Renouveler mon ID',
};