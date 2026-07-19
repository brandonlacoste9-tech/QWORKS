/**
 * Public site configuration for soft-launch (jobs-only beta).
 * Keep share links, SEO, and copy pointing at the production domain.
 */

export const PUBLIC_SITE_URL = 'https://www.quebec-emplois.ca';

/** Live NestJS API (Railway). Fallback also hard-coded in api.ts. */
export const PUBLIC_API_URL =
  'https://q-emplois-api-production-f1a6.up.railway.app/api/v1';

/** Geographic wedge for beta marketing. */
export const BETA_WEDGE = {
  fr: 'Montréal · Rive-Sud · Pointe-Claire',
  en: 'Montreal · South Shore · Pointe-Claire',
} as const;

export const FOUNDING_TASKER = {
  limit: 50,
  bonusCredits: 60,
  lifetimeDiscountPercent: 20,
} as const;

/** Absolute URL for share/copy text (no trailing slash). */
export function sitePath(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${PUBLIC_SITE_URL}${p}`;
}
