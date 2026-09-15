import {
  ConsentTrackerStatus,
  CookieOrderField,
  OrderDirection,
} from '@transcend-io/privacy-types';

import {
  COOKIE_TRIAGE_DORMANT_MS,
  COOKIE_TRIAGE_UI_PAGE_SIZE,
  CookieTriagePurposeCategory,
  type CookieTriagePurposeCategory as CookieTriagePurposeCategoryValue,
} from './cookieTriageConfig.js';
import {
  ConsentTriageType,
  CookieTriageDecision,
  type CookieTriageAnalysis,
  type ConsentTriageType as ConsentTriageTypeValue,
  type CookieTriageDecision as CookieTriageDecisionValue,
} from './cookieTriageTypes.js';

export {
  COOKIE_TRIAGE_AUTOFILL_PAGES,
  COOKIE_TRIAGE_DORMANT_MS,
  COOKIE_TRIAGE_UI_PAGE_SIZE,
} from './cookieTriageConfig.js';

/** ISO 8601 cutoff for dormant last-seen filters (`now - 30 days`). */
export function dormantCutoffIso(now = Date.now()): string {
  return new Date(now - COOKIE_TRIAGE_DORMANT_MS).toISOString();
}

/**
 * Arguments for `consent_list_cookies` or `consent_list_data_flows` for one purpose tab.
 *
 * `Custom` filters to every non-default purpose slug; other tabs filter by their slug
 * (including `Unknown`). Returns `null` when `Custom` is requested with no custom slugs —
 * callers must skip the fetch instead of issuing an unfiltered query.
 */
export function buildTriageListArgs(
  triageType: ConsentTriageTypeValue,
  purpose: CookieTriagePurposeCategoryValue,
  offset: number,
  customPurposeSlugs: readonly string[] = [],
): Record<string, unknown> | null {
  const purposeSlugs =
    purpose === CookieTriagePurposeCategory.Custom ? [...customPurposeSlugs] : [purpose];
  // Custom purposes are expected to provide a customPurposeSlug.
  if (purposeSlugs.length === 0) {
    return null;
  }

  const purposeFilter =
    triageType === ConsentTriageType.Cookies
      ? { trackingPurposes: purposeSlugs }
      : { trackingTypes: purposeSlugs };

  return {
    status: ConsentTrackerStatus.NeedsReview,
    limit: COOKIE_TRIAGE_UI_PAGE_SIZE,
    offset,
    orderField: CookieOrderField.Occurrences,
    orderDirection: OrderDirection.Desc,
    // Data-flow triage includes never-active rows; cookie triage keeps the
    // default (omit) so NEEDS_REVIEW totals stay aligned with inventory stats.
    ...(triageType === ConsentTriageType.DataFlows ? { showZeroActivity: true } : {}),
    ...purposeFilter,
  };
}

/**
 * Count-only args for one purpose tab badge (`limit: 1`, same purpose filters as the list).
 * Returns `null` when Custom has no custom purpose slugs (same as `buildTriageListArgs`).
 */
export function buildTriagePurposeCountArgs(
  triageType: ConsentTriageTypeValue,
  purpose: CookieTriagePurposeCategoryValue,
  customPurposeSlugs: readonly string[] = [],
): Record<string, unknown> | null {
  const listArgs = buildTriageListArgs(triageType, purpose, 0, customPurposeSlugs);
  if (listArgs === null) {
    return null;
  }
  return {
    ...listArgs,
    limit: 1,
  };
}

/**
 * Count-only args for the full NEEDS_REVIEW backlog (`totalCount` is the overview Pending).
 */
export function buildTriagePendingCountArgs(): Record<string, unknown> {
  return {
    status: ConsentTrackerStatus.NeedsReview,
    limit: 1,
    offset: 0,
  };
}

/**
 * Count-only args for NEEDS_REVIEW items last seen before the dormant cutoff.
 */
export function buildTriageDormantCountArgs(now = Date.now()): Record<string, unknown> {
  return {
    status: ConsentTrackerStatus.NeedsReview,
    limit: 1,
    offset: 0,
    lastDiscoveredAtBefore: dormantCutoffIso(now),
  };
}

/**
 * Fields shared by cookie and data-flow update payloads for one triage mutation.
 */
function triageUpdateFields(
  decision: CookieTriageDecisionValue | undefined,
  item: CookieTriageAnalysis,
): Record<string, unknown> {
  if (decision === undefined) {
    return { status: ConsentTrackerStatus.NeedsReview, isJunk: false };
  }
  if (decision === CookieTriageDecision.Approve) {
    return {
      status: ConsentTrackerStatus.Live,
      isJunk: false,
      ...(item.trackingPurposes && item.trackingPurposes.length > 0
        ? { trackingPurposes: item.trackingPurposes }
        : {}),
    };
  }
  if (decision === CookieTriageDecision.Junk) {
    return { status: ConsentTrackerStatus.Live, isJunk: true };
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
  decision: CookieTriageDecisionValue | undefined;
}

/**
 * Arguments for `consent_update_cookies` or `consent_update_data_flows`
 * covering one or more triage rows in a single tool call.
 *
 * Pass `decision: undefined` on a target to restore `NEEDS_REVIEW` (undo).
 */
export function buildTriageBulkUpdateArgs(
  triageType: ConsentTriageTypeValue,
  targets: readonly TriageUpdateTarget[],
): Record<string, unknown> {
  if (targets.length === 0) {
    throw new Error('At least one triage update target is required');
  }
  if (triageType === ConsentTriageType.Cookies) {
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
  triageType: ConsentTriageTypeValue,
  item: CookieTriageAnalysis,
  decision: CookieTriageDecisionValue | undefined,
): Record<string, unknown> {
  return buildTriageBulkUpdateArgs(triageType, [{ item, decision }]);
}

/**
 * Arguments to persist only the Notes (`description`) field for one triage row.
 */
export function buildTriageNotesUpdateArgs(
  triageType: ConsentTriageTypeValue,
  item: CookieTriageAnalysis,
  notes: string,
): Record<string, unknown> {
  if (triageType === ConsentTriageType.Cookies) {
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
  triageType: ConsentTriageTypeValue,
  item: CookieTriageAnalysis,
  trackingPurposes: string[],
): Record<string, unknown> {
  if (triageType === ConsentTriageType.Cookies) {
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
