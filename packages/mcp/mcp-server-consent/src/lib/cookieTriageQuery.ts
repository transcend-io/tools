import type {
  ConsentTriageType,
  CookieTriageAnalysis,
  CookieTriageDecision,
} from './cookieTriageTypes.js';
import type { CookieTriagePurposeCategory } from './resolvePrimaryCookiePurpose.js';

/** Page size the triage view requests from list tools */
export const COOKIE_TRIAGE_UI_PAGE_SIZE = 20;

/** Extra list pages to pull when a page claims zero rows for the active tab */
export const COOKIE_TRIAGE_AUTOFILL_PAGES = 5;

/** Items with no telemetry in this window are treated as dormant */
export const COOKIE_TRIAGE_DORMANT_MS = 1000 * 60 * 60 * 24 * 30;

/** ISO 8601 cutoff for dormant last-seen filters (`now - 30 days`). */
export function dormantCutoffIso(now = Date.now()): string {
  return new Date(now - COOKIE_TRIAGE_DORMANT_MS).toISOString();
}

/**
 * Arguments for `consent_list_cookies` or `consent_list_data_flows` for one purpose tab.
 *
 * `Custom` filters to every non-default purpose slug; other tabs filter by their slug
 * (including `Unknown`).
 */
export function buildTriageListArgs(
  triageType: ConsentTriageType,
  purpose: CookieTriagePurposeCategory,
  offset: number,
  customPurposeSlugs: readonly string[] = [],
): Record<string, unknown> {
  const purposeSlugs = purpose === 'Custom' ? [...customPurposeSlugs] : [purpose];
  const purposeFilter =
    purposeSlugs.length === 0
      ? {}
      : triageType === 'cookies'
        ? { trackingPurposes: purposeSlugs }
        : { trackingTypes: purposeSlugs };

  return {
    status: 'NEEDS_REVIEW',
    first: COOKIE_TRIAGE_UI_PAGE_SIZE,
    offset,
    orderField: 'occurrences',
    orderDirection: 'DESC',
    // Data-flow triage includes never-active rows; cookie triage keeps the
    // default (omit) so NEEDS_REVIEW totals stay aligned with inventory stats.
    ...(triageType === 'data_flows' ? { showZeroActivity: true } : {}),
    ...purposeFilter,
  };
}

/**
 * Count-only args for one purpose tab badge (`first: 1`, same purpose filters as the list).
 */
export function buildTriagePurposeCountArgs(
  triageType: ConsentTriageType,
  purpose: CookieTriagePurposeCategory,
  customPurposeSlugs: readonly string[] = [],
): Record<string, unknown> {
  return {
    ...buildTriageListArgs(triageType, purpose, 0, customPurposeSlugs),
    first: 1,
  };
}

/**
 * Count-only args for the full NEEDS_REVIEW backlog (`totalCount` is the overview Pending).
 */
export function buildTriagePendingCountArgs(): Record<string, unknown> {
  return {
    status: 'NEEDS_REVIEW',
    first: 1,
    offset: 0,
  };
}

/**
 * Count-only args for NEEDS_REVIEW items last seen before the dormant cutoff.
 */
export function buildTriageDormantCountArgs(now = Date.now()): Record<string, unknown> {
  return {
    status: 'NEEDS_REVIEW',
    first: 1,
    offset: 0,
    lastDiscoveredAtBefore: dormantCutoffIso(now),
  };
}

/**
 * Fields shared by cookie and data-flow update payloads for one triage mutation.
 */
function triageUpdateFields(
  decision: CookieTriageDecision | undefined,
  item: CookieTriageAnalysis,
): Record<string, unknown> {
  if (decision === undefined) {
    return { status: 'NEEDS_REVIEW', isJunk: false };
  }
  if (decision === 'approve') {
    return {
      status: 'LIVE',
      isJunk: false,
      ...(item.trackingPurposes && item.trackingPurposes.length > 0
        ? { trackingPurposes: item.trackingPurposes }
        : {}),
    };
  }
  if (decision === 'junk') {
    return { status: 'LIVE', isJunk: true };
  }
  throw new Error(`Unsupported triage decision: ${decision}`);
}

/**
 * One row in a batched triage update payload.
 */
export interface TriageUpdateTarget {
  /** Cookie or data-flow snapshot to update */
  item: CookieTriageAnalysis;
  /** Decision to persist; `undefined` restores `NEEDS_REVIEW` */
  decision: CookieTriageDecision | undefined;
}

/**
 * Arguments for `consent_update_cookies` or `consent_update_data_flows`
 * covering one or more triage rows in a single tool call.
 *
 * Pass `decision: undefined` on a target to restore `NEEDS_REVIEW` (undo).
 */
export function buildTriageBulkUpdateArgs(
  triageType: ConsentTriageType,
  targets: readonly TriageUpdateTarget[],
): Record<string, unknown> {
  if (targets.length === 0) {
    throw new Error('At least one triage update target is required');
  }
  if (triageType === 'cookies') {
    return {
      cookies: targets.map(({ item, decision }) => ({
        name: item.name,
        ...triageUpdateFields(decision, item),
      })),
    };
  }
  return {
    dataFlows: targets.map(({ item, decision }) => ({
      id: item.id,
      ...triageUpdateFields(decision, item),
    })),
  };
}

/**
 * Arguments for `consent_update_cookies` or `consent_update_data_flows`.
 *
 * Pass `decision: undefined` to restore `NEEDS_REVIEW` (undo).
 */
export function buildTriageUpdateArgs(
  triageType: ConsentTriageType,
  item: CookieTriageAnalysis,
  decision: CookieTriageDecision | undefined,
): Record<string, unknown> {
  return buildTriageBulkUpdateArgs(triageType, [{ item, decision }]);
}

/**
 * Arguments to persist only the Notes (`description`) field for one triage row.
 */
export function buildTriageNotesUpdateArgs(
  triageType: ConsentTriageType,
  item: CookieTriageAnalysis,
  notes: string,
): Record<string, unknown> {
  if (triageType === 'cookies') {
    return {
      cookies: [
        {
          name: item.name,
          description: notes,
        },
      ],
    };
  }
  return {
    dataFlows: [
      {
        id: item.id,
        description: notes,
      },
    ],
  };
}

/**
 * Arguments to persist only tracking purpose slugs for one triage row.
 */
export function buildTriagePurposesUpdateArgs(
  triageType: ConsentTriageType,
  item: CookieTriageAnalysis,
  trackingPurposes: string[],
): Record<string, unknown> {
  if (triageType === 'cookies') {
    return {
      cookies: [
        {
          name: item.name,
          trackingPurposes,
        },
      ],
    };
  }
  return {
    dataFlows: [
      {
        id: item.id,
        trackingPurposes,
      },
    ],
  };
}
