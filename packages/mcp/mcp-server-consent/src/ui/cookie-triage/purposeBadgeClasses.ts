import {
  CookieTriagePurposeCategory,
  isCookieTriagePurposeCategory,
} from '../../lib/resolvePrimaryCookiePurpose.ts';

/** Border + text utilities for a purpose outline badge. */
export const PURPOSE_BADGE_TONE: Record<CookieTriagePurposeCategory, string> = {
  [CookieTriagePurposeCategory.Essential]: 'border-purpose-essential text-purpose-essential',
  [CookieTriagePurposeCategory.Functional]: 'border-purpose-functional text-purpose-functional',
  [CookieTriagePurposeCategory.Advertising]: 'border-purpose-advertising text-purpose-advertising',
  [CookieTriagePurposeCategory.Analytics]: 'border-purpose-analytics text-purpose-analytics',
  [CookieTriagePurposeCategory.SaleOfInfo]: 'border-purpose-sale text-purpose-sale',
  [CookieTriagePurposeCategory.Custom]: 'border-purpose-other text-purpose-other',
  [CookieTriagePurposeCategory.Unknown]: 'border-purpose-other text-purpose-other',
};

function purposeBadgeTone(purpose: CookieTriagePurposeCategory): string {
  switch (purpose) {
    case CookieTriagePurposeCategory.Essential:
      return PURPOSE_BADGE_TONE[CookieTriagePurposeCategory.Essential];
    case CookieTriagePurposeCategory.Functional:
      return PURPOSE_BADGE_TONE[CookieTriagePurposeCategory.Functional];
    case CookieTriagePurposeCategory.Advertising:
      return PURPOSE_BADGE_TONE[CookieTriagePurposeCategory.Advertising];
    case CookieTriagePurposeCategory.Analytics:
      return PURPOSE_BADGE_TONE[CookieTriagePurposeCategory.Analytics];
    case CookieTriagePurposeCategory.SaleOfInfo:
      return PURPOSE_BADGE_TONE[CookieTriagePurposeCategory.SaleOfInfo];
    case CookieTriagePurposeCategory.Custom:
      return PURPOSE_BADGE_TONE[CookieTriagePurposeCategory.Custom];
    case CookieTriagePurposeCategory.Unknown:
      return PURPOSE_BADGE_TONE[CookieTriagePurposeCategory.Unknown];
    default: {
      const _exhaustive: never = purpose;
      return _exhaustive;
    }
  }
}

/** Outline badge classes for a known tab purpose or any org purpose slug. */
export function purposeBadgeClass(purposeSlug: string | undefined): string {
  const tone =
    purposeSlug !== undefined && isCookieTriagePurposeCategory(purposeSlug)
      ? purposeBadgeTone(purposeSlug)
      : PURPOSE_BADGE_TONE[CookieTriagePurposeCategory.Custom];
  return `border bg-fill-neutral ${tone}`;
}
