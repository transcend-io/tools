import {
  COOKIE_TRIAGE_DEFAULT_PURPOSE_SLUGS,
  COOKIE_TRIAGE_UNKNOWN_PURPOSE_SLUG,
  CookieTriageDefaultPurpose,
  CookieTriagePurposeCategory,
} from './cookieTriageConfig.js';

export {
  COOKIE_TRIAGE_DEFAULT_PURPOSE_SLUGS,
  COOKIE_TRIAGE_PURPOSE_LABELS,
  COOKIE_TRIAGE_PURPOSE_ORDER,
  COOKIE_TRIAGE_UNKNOWN_PURPOSE_SLUG,
  CookieTriageDefaultPurpose,
  CookieTriagePurposeCategory,
  getPurposeLabel,
  isCookieTriagePurposeCategory,
} from './cookieTriageConfig.js';

const PURPOSE_RANK_LOOKUP = new Map(
  COOKIE_TRIAGE_DEFAULT_PURPOSE_SLUGS.map((purpose, index) => [
    purpose.toLowerCase(),
    { purpose, index },
  ]),
);

const DEFAULT_PURPOSE_LOOKUP = new Set(
  COOKIE_TRIAGE_DEFAULT_PURPOSE_SLUGS.map((slug) => slug.toLowerCase()),
);

/**
 * Whether a tracking-purpose slug is the Unknown / unassigned purpose.
 */
export function isUnknownCookiePurposeSlug(slug: string): boolean {
  return slug.toLowerCase() === COOKIE_TRIAGE_UNKNOWN_PURPOSE_SLUG.toLowerCase();
}

/**
 * Whether a tracking-purpose slug is one of the built-in triage defaults.
 */
export function isDefaultCookiePurposeSlug(slug: string): boolean {
  return DEFAULT_PURPOSE_LOOKUP.has(slug.toLowerCase());
}

/**
 * Pick the highest-ranked purpose slug when a cookie has multiple assigned purposes.
 *
 * Rank (highest first): Essential, Functional, Advertising, Analytics, SaleOfInfo.
 * Returns `Unknown` when the list is empty or only `Unknown`, or `Custom` when only
 * other non-default slugs are present.
 */
export function resolvePrimaryCookiePurpose(
  trackingPurposes: string[] | undefined | null,
): CookieTriagePurposeCategory {
  if (!trackingPurposes?.length) {
    return CookieTriagePurposeCategory.Unknown;
  }

  let best: { purpose: CookieTriageDefaultPurpose; index: number } | undefined;

  for (const slug of trackingPurposes) {
    const match = PURPOSE_RANK_LOOKUP.get(slug.toLowerCase());
    if (match && (best === undefined || match.index < best.index)) {
      best = match;
    }
  }

  if (best) {
    return best.purpose;
  }

  const hasNonUnknownCustom = trackingPurposes.some(
    (slug) => slug.trim().length > 0 && !isUnknownCookiePurposeSlug(slug),
  );
  return hasNonUnknownCustom
    ? CookieTriagePurposeCategory.Custom
    : CookieTriagePurposeCategory.Unknown;
}
