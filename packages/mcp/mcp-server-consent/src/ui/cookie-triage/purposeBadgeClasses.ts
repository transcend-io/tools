import type { CookieTriagePurposeCategory } from '../../lib/resolvePrimaryCookiePurpose.ts';

/** Background utility for a purpose token badge. */
export const PURPOSE_BADGE_BG: Record<CookieTriagePurposeCategory, string> = {
  Essential: 'bg-purpose-essential',
  Functional: 'bg-purpose-functional',
  Advertising: 'bg-purpose-advertising',
  Analytics: 'bg-purpose-analytics',
  SaleOfInfo: 'bg-purpose-sale',
  Custom: 'bg-purpose-other',
  Unknown: 'bg-purpose-other',
};

/** Badge background for a known tab purpose or any org purpose slug. */
export function purposeBadgeClass(purposeSlug: string | undefined): string {
  if (purposeSlug !== undefined && purposeSlug in PURPOSE_BADGE_BG) {
    return PURPOSE_BADGE_BG[purposeSlug as CookieTriagePurposeCategory];
  }
  return PURPOSE_BADGE_BG.Custom;
}
