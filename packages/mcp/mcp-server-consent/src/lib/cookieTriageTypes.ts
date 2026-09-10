import { makeEnum } from '@transcend-io/type-utils';

import type { CookieTriagePurposeCategory } from './cookieTriageConfig.js';

/** What the consent triage review app loads from the API */
export const ConsentTriageType = makeEnum({
  /** Cookie inventory triage */
  Cookies: 'cookies',
  /** Data-flow inventory triage */
  DataFlows: 'data_flows',
});

/** Override type */
export type ConsentTriageType = (typeof ConsentTriageType)[keyof typeof ConsentTriageType];

/** User triage decision for a cookie or data-flow row */
export const CookieTriageDecision = makeEnum({
  /** Approve and mark LIVE */
  Approve: 'approve',
  /** Mark LIVE + junk */
  Junk: 'junk',
  /** Keep in review (explicit review decision) */
  Review: 'review',
});

/** Override type */
export type CookieTriageDecision = (typeof CookieTriageDecision)[keyof typeof CookieTriageDecision];

/** Per-tab / overview fetch status */
export const CookieTriageLoadStatus = makeEnum({
  /** Not started */
  Idle: 'idle',
  /** In flight */
  Loading: 'loading',
  /** Succeeded */
  Ready: 'ready',
  /** Failed */
  Error: 'error',
});

/** Override type */
export type CookieTriageLoadStatus =
  (typeof CookieTriageLoadStatus)[keyof typeof CookieTriageLoadStatus];

/** One selectable tracking purpose from `consent_list_purposes`. */
export interface CookieTriagePurposeOption {
  /** Purpose slug written to `trackingPurposes` / `trackingTypes` */
  slug: string;
  /** Human-readable label for the purpose select */
  label: string;
}

/** Cookie or data-flow item shown in the triage view */
export interface CookieTriageAnalysis {
  /** Cookie name or data-flow value (upsert / row key) */
  name: string;
  /** Transcend cookie or data-flow ID when available */
  id: string;
  /** Service or vendor title when known */
  service?: string;
  /** Notes / description from the dashboard when known */
  description?: string;
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
  /**
   * Admin dashboard base URL for deep links
   * (`TRANSCEND_DASHBOARD_URL` when set, else production default).
   */
  dashboardUrl: string;
  /** Display name of the organization being triaged */
  organizationName: string;
  /** Purpose categories with items to review */
  categories: CookieTriageCategoryPayload[];
  /**
   * Whether NEEDS_REVIEW rows have been fetched.
   * MCP App open returns `false` (fast shell); the baseline tool returns `true`.
   */
  loaded: boolean;
  /**
   * Agent-facing instruction on MCP App shell opens so the model does not
   * immediately re-fetch list tools after mounting the interactive UI.
   */
  message?: string;
}
