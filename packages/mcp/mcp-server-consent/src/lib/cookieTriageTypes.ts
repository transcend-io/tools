import type { CookieTriagePurposeCategory } from './resolvePrimaryCookiePurpose.js';

/** Agent classification suggestion for a cookie */
export type CookieTriageSuggestion = 'approve' | 'junk' | 'review';

/** Researched cookie passed into the triage view */
export interface CookieTriageAnalysis {
  /** Cookie name (upsert key) */
  name: string;
  /** Transcend cookie ID when available */
  id?: string;
  /** Service or vendor title when known */
  service?: string;
  /** Current assigned purpose slugs from the API (used to group into purpose tabs) */
  trackingPurposes?: string[];
  /** Telemetry occurrences when available */
  occurrences?: number;
  /** ISO 8601 timestamp when the cookie was last seen in telemetry */
  lastActivityAt?: string;
  /** Agent classification suggestion */
  suggestion: CookieTriageSuggestion;
  /** One-sentence rationale for the suggestion */
  reason: string;
}

/** Input passed to `consent_cookie_triage_review_app` (ungrouped; the tool groups by purpose) */
export interface CookieTriageAppInput {
  /** Display name of the organization being triaged */
  organizationName: string;
  /** Researched cookies; purpose tabs are derived from trackingPurposes */
  cookies: CookieTriageAnalysis[];
}

/** Category payload returned to baseline hosts and the MCP App view */
export interface CookieTriageCategoryPayload {
  /** Primary purpose bucket for this group */
  purpose: CookieTriagePurposeCategory;
  /** Total cookies in this bucket after grouping (may exceed cookies.length when capped) */
  totalCount: number;
  /** Analyzed cookies passed for display (capped, sorted by occurrences) */
  cookies: CookieTriageAnalysis[];
  /** Number of cookies included in this payload (cookies.length) */
  shownCount: number;
}

/** Payload shared by the baseline tool and the MCP App variant */
export interface CookieTriageAppPayload {
  /** Display name of the organization being triaged */
  organizationName: string;
  /** Purpose categories with analyzed cookies */
  categories: CookieTriageCategoryPayload[];
}
