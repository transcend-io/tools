/** Rank order: highest wins when a cookie has multiple purposes */
const PURPOSE_RANK = ['Essential', 'Functional', 'Advertising', 'Analytics', 'SaleOfInfo'] as const;

/** Primary purpose bucket used when grouping cookies for triage */
export type CookieTriagePurposeCategory = (typeof PURPOSE_RANK)[number] | 'NoPurpose';

/** Display order for purpose tabs in the cookie triage UI */
export const COOKIE_TRIAGE_PURPOSE_ORDER: readonly CookieTriagePurposeCategory[] = [
  ...PURPOSE_RANK,
  'NoPurpose',
];

/** Human-readable labels for purpose category tabs */
export const COOKIE_TRIAGE_PURPOSE_LABELS: Record<CookieTriagePurposeCategory, string> = {
  Essential: 'Essential',
  Functional: 'Functional',
  Advertising: 'Advertising',
  Analytics: 'Analytics',
  SaleOfInfo: 'Sale of Personal Info',
  NoPurpose: 'Other',
};

const PURPOSE_RANK_LOOKUP = new Map(
  PURPOSE_RANK.map((purpose, index) => [purpose.toLowerCase(), { purpose, index }]),
);

/**
 * Pick the highest-ranked purpose slug when a cookie has multiple assigned purposes.
 *
 * Rank (highest first): Essential, Functional, Advertising, Analytics, SaleOfInfo.
 * Returns `NoPurpose` when the list is empty or contains no recognized slugs.
 */
export function resolvePrimaryCookiePurpose(
  trackingPurposes: string[] | undefined | null,
): CookieTriagePurposeCategory {
  if (!trackingPurposes?.length) {
    return 'NoPurpose';
  }

  let best: { purpose: (typeof PURPOSE_RANK)[number]; index: number } | undefined;

  for (const slug of trackingPurposes) {
    const match = PURPOSE_RANK_LOOKUP.get(slug.toLowerCase());
    if (match && (best === undefined || match.index < best.index)) {
      best = match;
    }
  }

  return best?.purpose ?? 'NoPurpose';
}
