import {
  CookieTriagePurposeCategory,
  isCookieTriagePurposeCategory,
} from '../../lib/resolvePrimaryCookiePurpose.ts';

/** Background utility for a purpose token badge. */
export const PURPOSE_BADGE_BG: Record<CookieTriagePurposeCategory, string> = {
  [CookieTriagePurposeCategory.Essential]: 'bg-purpose-essential',
  [CookieTriagePurposeCategory.Functional]: 'bg-purpose-functional',
  [CookieTriagePurposeCategory.Advertising]: 'bg-purpose-advertising',
  [CookieTriagePurposeCategory.Analytics]: 'bg-purpose-analytics',
  [CookieTriagePurposeCategory.SaleOfInfo]: 'bg-purpose-sale',
  [CookieTriagePurposeCategory.Custom]: 'bg-purpose-other',
  [CookieTriagePurposeCategory.Unknown]: 'bg-purpose-other',
};

function purposeBadgeBg(purpose: CookieTriagePurposeCategory): string {
  switch (purpose) {
    case CookieTriagePurposeCategory.Essential:
      return PURPOSE_BADGE_BG[CookieTriagePurposeCategory.Essential];
    case CookieTriagePurposeCategory.Functional:
      return PURPOSE_BADGE_BG[CookieTriagePurposeCategory.Functional];
    case CookieTriagePurposeCategory.Advertising:
      return PURPOSE_BADGE_BG[CookieTriagePurposeCategory.Advertising];
    case CookieTriagePurposeCategory.Analytics:
      return PURPOSE_BADGE_BG[CookieTriagePurposeCategory.Analytics];
    case CookieTriagePurposeCategory.SaleOfInfo:
      return PURPOSE_BADGE_BG[CookieTriagePurposeCategory.SaleOfInfo];
    case CookieTriagePurposeCategory.Custom:
      return PURPOSE_BADGE_BG[CookieTriagePurposeCategory.Custom];
    case CookieTriagePurposeCategory.Unknown:
      return PURPOSE_BADGE_BG[CookieTriagePurposeCategory.Unknown];
    default: {
      const _exhaustive: never = purpose;
      return _exhaustive;
    }
  }
}

/** Badge background for a known tab purpose or any org purpose slug. */
export function purposeBadgeClass(purposeSlug: string | undefined): string {
  if (purposeSlug !== undefined && isCookieTriagePurposeCategory(purposeSlug)) {
    return purposeBadgeBg(purposeSlug);
  }
  return PURPOSE_BADGE_BG[CookieTriagePurposeCategory.Custom];
}
