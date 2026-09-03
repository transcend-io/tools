/** Rank order: highest wins when a cookie has multiple purposes */
const PURPOSE_RANK = ['Essential', 'Functional', 'Advertising', 'Analytics', 'SaleOfInfo'] as const;

/** Built-in tracking-purpose slugs used by the default triage tabs */
export const COOKIE_TRIAGE_DEFAULT_PURPOSE_SLUGS: readonly (typeof PURPOSE_RANK)[number][] =
  PURPOSE_RANK;

/** API / tab slug for cookies with no assigned tracking purpose */
export const COOKIE_TRIAGE_UNKNOWN_PURPOSE_SLUG = 'Unknown';

/** Primary purpose bucket used when grouping cookies for triage */
export type CookieTriagePurposeCategory = (typeof PURPOSE_RANK)[number] | 'Custom' | 'Unknown';

/** Display order for purpose tabs in the cookie triage UI */
export const COOKIE_TRIAGE_PURPOSE_ORDER: readonly CookieTriagePurposeCategory[] = [
  ...PURPOSE_RANK,
  'Unknown',
  'Custom',
];

/** Human-readable labels for purpose category tabs */
export const COOKIE_TRIAGE_PURPOSE_LABELS: Record<CookieTriagePurposeCategory, string> = {
  Essential: 'Essential',
  Functional: 'Functional',
  Advertising: 'Advertising',
  Analytics: 'Analytics',
  SaleOfInfo: 'Sale of Personal Info',
  Unknown: 'Unknown',
  Custom: 'Custom',
};

const PURPOSE_RANK_LOOKUP = new Map(
  PURPOSE_RANK.map((purpose, index) => [purpose.toLowerCase(), { purpose, index }]),
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
    return 'Unknown';
  }

  let best: { purpose: (typeof PURPOSE_RANK)[number]; index: number } | undefined;

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
  return hasNonUnknownCustom ? 'Custom' : 'Unknown';
}
