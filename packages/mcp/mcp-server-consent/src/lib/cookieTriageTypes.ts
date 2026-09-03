import type { CookieTriagePurposeCategory } from './resolvePrimaryCookiePurpose.js';

/** What the consent triage review app loads from the API */
export type ConsentTriageType = 'cookies' | 'data_flows';

/** User triage decision for a cookie or data-flow row */
export type CookieTriageDecision = 'approve' | 'junk' | 'review';

/** Cookie or data-flow item shown in the triage view */
export interface CookieTriageAnalysis {
  /** Cookie name or data-flow value (upsert / row key) */
  name: string;
  /** Transcend cookie or data-flow ID when available */
  id?: string;
  /** Service or vendor title when known */
  service?: string;
  /** Current assigned purpose slugs from the API (used to group into purpose tabs) */
  trackingPurposes?: string[];
  /** Telemetry occurrences when available */
  occurrences?: number;
  /** ISO 8601 timestamp when the item was last seen in telemetry */
  lastActivityAt?: string;
}

/** Input passed to `consent_cookie_triage_review_app` */
export interface CookieTriageAppInput {
  /**
   * Whether to open the review UI for cookies or data flows needing review.
   * Baseline hosts fetch organization name and NEEDS_REVIEW items in the tool
   * handler; MCP App hosts open a shell and the view pages list tools itself.
   */
  triageType: ConsentTriageType;
}

/** Category payload returned to baseline hosts and the MCP App view */
export interface CookieTriageCategoryPayload {
  /** Primary purpose bucket for this group */
  purpose: CookieTriagePurposeCategory;
  /** Total items in this bucket after grouping (may exceed cookies.length when capped) */
  totalCount: number;
  /** Items passed for display (capped, sorted by occurrences) */
  cookies: CookieTriageAnalysis[];
  /** Number of items included in this payload (cookies.length) */
  shownCount: number;
}

/** Payload shared by the baseline tool and the MCP App view */
export interface CookieTriageAppPayload {
  /** Whether this payload is cookies or data flows */
  triageType: ConsentTriageType;
  /** Display name of the organization being triaged */
  organizationName: string;
  /** Purpose categories with items to review */
  categories: CookieTriageCategoryPayload[];
  /**
   * Whether NEEDS_REVIEW rows have been fetched.
   * MCP App open returns `false` (fast shell); the baseline tool returns `true`.
   */
  loaded: boolean;
}
