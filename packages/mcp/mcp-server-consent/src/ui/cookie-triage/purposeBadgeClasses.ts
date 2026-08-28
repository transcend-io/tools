import type { CookieTriagePurposeCategory } from '../../lib/resolvePrimaryCookiePurpose.ts';

/** Background utility for a purpose token badge. */
export const PURPOSE_BADGE_BG: Record<CookieTriagePurposeCategory, string> = {
  Essential: 'bg-purpose-essential',
  Functional: 'bg-purpose-functional',
  Advertising: 'bg-purpose-advertising',
  Analytics: 'bg-purpose-analytics',
  SaleOfInfo: 'bg-purpose-sale',
  NoPurpose: 'bg-purpose-other',
};
