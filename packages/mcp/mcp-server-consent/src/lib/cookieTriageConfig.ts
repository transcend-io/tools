import { makeEnum } from '@transcend-io/type-utils';

/**
 * Tunable constants and shared enums for the consent triage MCP App.
 *
 * Keep experience knobs here so purpose tabs, fetch caps, and suggestion
 * thresholds can be adjusted in one place.
 */

/** Page size the triage view requests from list tools */
export const COOKIE_TRIAGE_UI_PAGE_SIZE = 20;

/** Extra list pages to pull when a page claims zero rows for the active tab */
export const COOKIE_TRIAGE_AUTOFILL_PAGES = 5;

/** Items with no telemetry in this window are treated as dormant */
export const COOKIE_TRIAGE_DORMANT_MS = 1000 * 60 * 60 * 24 * 30;

/** Max cookies shown per purpose bucket in the triage UI */
export const COOKIE_TRIAGE_MAX_PER_PURPOSE = 100;

/** Page size when the triage app pulls NEEDS_REVIEW items (baseline hosts) */
export const COOKIE_TRIAGE_FETCH_PAGE_SIZE = 100;

/** Soft cap for a single triage app open across all purpose tabs */
export const COOKIE_TRIAGE_FETCH_MAX = COOKIE_TRIAGE_MAX_PER_PURPOSE * 6;

/** Encounter count below which a row is suggested as junk */
export const COOKIE_TRIAGE_MIN_OCCURRENCES = 5;

/** API / tab slug for cookies with no assigned tracking purpose */
export const COOKIE_TRIAGE_UNKNOWN_PURPOSE_SLUG = 'Unknown';

/** Built-in tracking-purpose slugs used by the default triage tabs (rank order) */
export const CookieTriageDefaultPurpose = makeEnum({
  /** Strictly necessary */
  Essential: 'Essential',
  /** Functional / preference */
  Functional: 'Functional',
  /** Advertising / marketing */
  Advertising: 'Advertising',
  /** Analytics / measurement */
  Analytics: 'Analytics',
  /** Sale of personal information */
  SaleOfInfo: 'SaleOfInfo',
});

/** Override type */
export type CookieTriageDefaultPurpose =
  (typeof CookieTriageDefaultPurpose)[keyof typeof CookieTriageDefaultPurpose];

/** Primary purpose bucket used when grouping cookies for triage */
export const CookieTriagePurposeCategory = makeEnum({
  ...CookieTriageDefaultPurpose,
  /** No assigned tracking purpose */
  Unknown: 'Unknown',
  /** Org-defined non-default purposes */
  Custom: 'Custom',
});

/** Override type */
export type CookieTriagePurposeCategory =
  (typeof CookieTriagePurposeCategory)[keyof typeof CookieTriagePurposeCategory];

/** Built-in tracking-purpose slugs used by the default triage tabs */
export const COOKIE_TRIAGE_DEFAULT_PURPOSE_SLUGS: readonly CookieTriageDefaultPurpose[] = [
  CookieTriageDefaultPurpose.Essential,
  CookieTriageDefaultPurpose.Functional,
  CookieTriageDefaultPurpose.Advertising,
  CookieTriageDefaultPurpose.Analytics,
  CookieTriageDefaultPurpose.SaleOfInfo,
];

/** Display order for purpose tabs in the cookie triage UI */
export const COOKIE_TRIAGE_PURPOSE_ORDER: readonly CookieTriagePurposeCategory[] = [
  ...COOKIE_TRIAGE_DEFAULT_PURPOSE_SLUGS,
  CookieTriagePurposeCategory.Unknown,
  CookieTriagePurposeCategory.Custom,
];

/** Human-readable labels for purpose category tabs */
export const COOKIE_TRIAGE_PURPOSE_LABELS: Record<CookieTriagePurposeCategory, string> = {
  [CookieTriagePurposeCategory.Essential]: 'Essential',
  [CookieTriagePurposeCategory.Functional]: 'Functional',
  [CookieTriagePurposeCategory.Advertising]: 'Advertising',
  [CookieTriagePurposeCategory.Analytics]: 'Analytics',
  [CookieTriagePurposeCategory.SaleOfInfo]: 'Sale of Info',
  [CookieTriagePurposeCategory.Unknown]: 'Unknown',
  [CookieTriagePurposeCategory.Custom]: 'Custom',
};

/**
 * Look up a purpose label via literal keys.
 *
 * Prefer this over `COOKIE_TRIAGE_PURPOSE_LABELS[purpose]` so
 * `noUncheckedIndexedAccess` does not widen the result to `string | undefined`.
 */
export function getPurposeLabel(purpose: CookieTriagePurposeCategory): string {
  switch (purpose) {
    case CookieTriagePurposeCategory.Essential:
      return COOKIE_TRIAGE_PURPOSE_LABELS[CookieTriagePurposeCategory.Essential];
    case CookieTriagePurposeCategory.Functional:
      return COOKIE_TRIAGE_PURPOSE_LABELS[CookieTriagePurposeCategory.Functional];
    case CookieTriagePurposeCategory.Advertising:
      return COOKIE_TRIAGE_PURPOSE_LABELS[CookieTriagePurposeCategory.Advertising];
    case CookieTriagePurposeCategory.Analytics:
      return COOKIE_TRIAGE_PURPOSE_LABELS[CookieTriagePurposeCategory.Analytics];
    case CookieTriagePurposeCategory.SaleOfInfo:
      return COOKIE_TRIAGE_PURPOSE_LABELS[CookieTriagePurposeCategory.SaleOfInfo];
    case CookieTriagePurposeCategory.Unknown:
      return COOKIE_TRIAGE_PURPOSE_LABELS[CookieTriagePurposeCategory.Unknown];
    case CookieTriagePurposeCategory.Custom:
      return COOKIE_TRIAGE_PURPOSE_LABELS[CookieTriagePurposeCategory.Custom];
    default: {
      const _exhaustive: never = purpose;
      return _exhaustive;
    }
  }
}

/** Whether a string is one of the built-in triage purpose-tab slugs. */
export function isCookieTriagePurposeCategory(value: string): value is CookieTriagePurposeCategory {
  return (COOKIE_TRIAGE_PURPOSE_ORDER as readonly string[]).includes(value);
}
