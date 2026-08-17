/** Tracker kind currently under review. */
export type CookieTriageReviewType = 'cookie' | 'data_flow';

/** Confidence of the suggested triage action. */
export type CookieTriageConfidence = 'high' | 'medium' | 'low';

/** Suggested approve / junk action. */
export type CookieTriageSuggestedAction = 'approve' | 'junk';

/** Occurrence count plus a human-readable explanation. */
export interface CookieTriageOccurrences {
  /** Raw occurrence count from recent telemetry */
  count: number;
  /** Human-readable summary shown under the count */
  summary: string;
}

/** Model / heuristic recommendation for the current item. */
export interface CookieTriageSuggestion {
  /** How confident the recommendation is */
  confidence: CookieTriageConfidence;
  /** Recommended action */
  action: CookieTriageSuggestedAction;
  /** Short reasoning shown in the suggested-action callout */
  reasoning: string;
}

/** Purpose and service classification for the current item. */
export interface CookieTriageClassification {
  /** Tracking purpose display name */
  purpose: string;
  /** Tracking purpose slug used in cookie mutations */
  purposeSlug: string;
  /** Purpose UUID used in data-flow mutations */
  purposeId: string;
  /** Service display title */
  service: string;
  /** Service integration name used in mutations when available */
  serviceKey: string;
}

/** Sibling items that can be approved together. */
export interface CookieTriageBulkGroup {
  /** Number of similar items besides the current one */
  siblingCount: number;
  /** Shared service name for the bulk group */
  service: string;
  /** Mutation ids of the siblings (excludes the current item) */
  siblingIds: string[];
}

/** Purpose option for the classification dropdown. */
export interface CookieTriagePurposeOption {
  /** Display label */
  label: string;
  /** Tracking purpose slug */
  value: string;
  /** Purpose UUID */
  id: string;
}

/** Dropdown / datalist options for the review card. */
export interface CookieTriageOptions {
  /** Purpose choices from the org */
  purposes: CookieTriagePurposeOption[];
  /** Service titles seen in the current backlog */
  services: string[];
}

/** Active organization identity for the triage session. */
export interface CookieTriageOrganization {
  /** Organization UUID */
  id: string;
  /** Display name */
  name: string;
}

/** Single cookie or data flow in the triage queue. */
export interface CookieTriageItem {
  /** Mutation key: cookie name, or data-flow UUID */
  id: string;
  /** Cookie name / regex, or data-flow domain */
  identifier: string;
  /** Description on file, if any */
  description: string;
  /** How the item was discovered (human-readable) */
  source: string;
  /** Telemetry occurrence stats */
  occurrences: CookieTriageOccurrences;
  /** Suggested action callout */
  suggestion: CookieTriageSuggestion;
  /** Current purpose / service classification */
  classification: CookieTriageClassification;
  /** Optional bulk-approve group for similar siblings */
  bulkGroup?: CookieTriageBulkGroup;
}

/** Payload shape returned by `consent_cookie_triage`. */
export interface CookieTriageViewData {
  /** Whether this card is reviewing a cookie or a data flow */
  reviewType?: CookieTriageReviewType;
  /** 1-based position of the current item in the review-type backlog */
  index?: number;
  /** Size of the current review-type backlog */
  total?: number;
  /** Item currently under review */
  item?: CookieTriageItem;
  /** Classification dropdown options */
  options?: CookieTriageOptions;
  /** Active organization for this session */
  organization?: CookieTriageOrganization;
  /** Forward cookie cursor from the previous card */
  after?: string;
  /** Peek watermark createdAt */
  headCreatedAt?: string;
  /** Peek watermark GraphQL cookie id */
  headId?: string;
  /** Cards shown so far this session */
  sessionIndex?: number;
  /** Data-flow fallback skip count */
  dataFlowSkipCount?: number;
  /** Whether the current cookie card came from peek */
  fromPeek?: boolean;
  /** endCursor from the fetch that produced the current cookie card */
  cardEndCursor?: string;
  /** GraphQL cookie UUID for the current card */
  cardCookieId?: string;
  /** createdAt of the current cookie card */
  cardCreatedAt?: string;
}

/** Draft classification edits held in the view before an act call. */
export interface CookieTriageDraft {
  /** Selected purpose slug */
  purposeSlug: string;
  /** Selected purpose UUID */
  purposeId: string;
  /** Service title / key to assign */
  service: string;
}
