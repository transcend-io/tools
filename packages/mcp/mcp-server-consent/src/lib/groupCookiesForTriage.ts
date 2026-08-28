import type { CookieTriageAnalysis, CookieTriageCategoryPayload } from './cookieTriageTypes.js';
import {
  COOKIE_TRIAGE_PURPOSE_ORDER,
  resolvePrimaryCookiePurpose,
  type CookieTriagePurposeCategory,
} from './resolvePrimaryCookiePurpose.js';

/** Max cookies shown per purpose bucket in the triage UI */
export const COOKIE_TRIAGE_MAX_PER_PURPOSE = 100;

/** Sort cookies highest traffic first; missing occurrences rank last. */
export function compareCookiesByOccurrencesDesc(
  a: CookieTriageAnalysis,
  b: CookieTriageAnalysis,
): number {
  return (b.occurrences ?? 0) - (a.occurrences ?? 0);
}

/**
 * Group flat researched cookies by primary purpose, sort by occurrences, and cap per bucket.
 *
 * Primary purpose uses {@link resolvePrimaryCookiePurpose} on each cookie's `trackingPurposes`.
 * `totalCount` is the full grouped size; `cookies` / `shownCount` are capped at
 * {@link COOKIE_TRIAGE_MAX_PER_PURPOSE}.
 */
export function groupCookiesForTriage(
  cookies: readonly CookieTriageAnalysis[],
): CookieTriageCategoryPayload[] {
  const buckets = new Map<CookieTriagePurposeCategory, CookieTriageAnalysis[]>();

  for (const cookie of cookies) {
    const purpose = resolvePrimaryCookiePurpose(cookie.trackingPurposes);
    const list = buckets.get(purpose);
    if (list) {
      list.push(cookie);
    } else {
      buckets.set(purpose, [cookie]);
    }
  }

  return COOKIE_TRIAGE_PURPOSE_ORDER.flatMap((purpose) => {
    const grouped = buckets.get(purpose);
    if (!grouped?.length) {
      return [];
    }

    const sorted = [...grouped].sort(compareCookiesByOccurrencesDesc);
    const shown = sorted.slice(0, COOKIE_TRIAGE_MAX_PER_PURPOSE);
    return [
      {
        purpose,
        totalCount: sorted.length,
        cookies: shown,
        shownCount: shown.length,
      },
    ];
  });
}
