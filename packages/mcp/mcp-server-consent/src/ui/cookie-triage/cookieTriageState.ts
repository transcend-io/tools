import type {
  CookieTriageAnalysis,
  CookieTriageAppPayload,
  CookieTriageSuggestion,
} from '../../lib/cookieTriageTypes.ts';
import { compareCookiesByOccurrencesDesc } from '../../lib/groupCookiesForTriage.ts';
import {
  COOKIE_TRIAGE_PURPOSE_ORDER,
  type CookieTriagePurposeCategory,
} from '../../lib/resolvePrimaryCookiePurpose.ts';

export { compareCookiesByOccurrencesDesc } from '../../lib/groupCookiesForTriage.ts';

/** User triage decision for a cookie row */
export type CookieTriageDecision = CookieTriageSuggestion;

/** Live state for one cookie row within a purpose category */
export interface CookieRowState {
  /** Stable row key (cookie name) */
  name: string;
  /** Cloned snapshot of the cookie at load time; used as the undo reference */
  initial: CookieTriageAnalysis;
  /** Current user decision; undefined means still pending (matches initial) */
  decision?: CookieTriageDecision;
}

/** Live state for one purpose category bucket */
export interface CookieTriageCategoryState {
  /** Total cookies in this bucket org-wide */
  totalCount: number;
  /** Cookies shown in this category, sorted by occurrences (highest first) */
  cookies: CookieRowState[];
}

/** Purpose-keyed category state cloned from the tool payload */
export type CookieTriageCategoriesState = Partial<
  Record<CookieTriagePurposeCategory, CookieTriageCategoryState>
>;

/** Session state for the loaded cookie triage view */
export interface CookieTriageSessionState {
  /** Display name of the organization being triaged */
  organizationName: string;
  /** Purpose-keyed categories with live cookie rows */
  categories: CookieTriageCategoriesState;
  /** Purpose tab currently selected in the triage UI */
  selectedPurpose?: CookieTriagePurposeCategory;
}

/** Summary counts derived from row state */
export interface CookieTriageSummary {
  /** Rows with no decision yet */
  pendingCount: number;
  /** Pending rows with no telemetry in the last 30 days */
  dormantCount: number;
  /** Rows with a user decision */
  triagedCount: number;
}

/** Actions dispatched to {@link cookieTriageReducer} */
export type CookieTriageAction =
  | {
      /** Record a triage decision for one cookie */
      type: 'decide';
      /** Primary purpose bucket the cookie belongs to */
      purpose: CookieTriagePurposeCategory;
      /** Cookie name */
      name: string;
      /** Decision to apply */
      decision: CookieTriageDecision;
    }
  | {
      /** Revert one cookie row to its initial pending state */
      type: 'undo';
      /** Primary purpose bucket the cookie belongs to */
      purpose: CookieTriagePurposeCategory;
      /** Cookie name */
      name: string;
    }
  | {
      /** Select the active purpose tab */
      type: 'selectPurpose';
      /** Purpose category to show */
      purpose: CookieTriagePurposeCategory;
    }
  | {
      /**
       * Apply each pending row's non-review suggestion in one purpose category
       * (approve / junk only; review rows are skipped).
       */
      type: 'applySuggestions';
      /** Purpose category to apply within */
      purpose: CookieTriagePurposeCategory;
    };

const DORMANT_MS = 1000 * 60 * 60 * 24 * 30;

/** Whether a cookie has had no telemetry activity in the last 30 days. */
export function isDormantCookie(cookie: CookieTriageAnalysis): boolean {
  return (
    cookie.lastActivityAt !== undefined &&
    new Date(cookie.lastActivityAt).getTime() < Date.now() - DORMANT_MS
  );
}

/** Build initial session state from the MCP tool payload (already grouped/sorted by the tool). */
export function createInitialState(payload: CookieTriageAppPayload): CookieTriageSessionState {
  const categories: CookieTriageCategoriesState = {};

  for (const category of payload.categories) {
    categories[category.purpose] = {
      totalCount: category.totalCount,
      cookies: [...category.cookies].sort(compareCookiesByOccurrencesDesc).map((cookie) => ({
        name: cookie.name,
        initial: structuredClone(cookie),
      })),
    };
  }

  return {
    organizationName: payload.organizationName,
    categories,
    selectedPurpose: selectPurposes(categories)[0],
  };
}

/** Purpose keys present in the session, in canonical tab order. */
export function selectPurposes(
  categories: CookieTriageCategoriesState,
): CookieTriagePurposeCategory[] {
  return COOKIE_TRIAGE_PURPOSE_ORDER.filter((purpose) => categories[purpose] !== undefined);
}

/** Derive overview counts from all category rows. */
export function selectSummary(categories: CookieTriageCategoriesState): CookieTriageSummary {
  let pendingCount = 0;
  let dormantCount = 0;
  let triagedCount = 0;

  for (const category of Object.values(categories)) {
    if (!category) {
      continue;
    }

    for (const row of category.cookies) {
      if (row.decision === undefined) {
        pendingCount++;
        if (isDormantCookie(row.initial)) {
          dormantCount++;
        }
      } else {
        triagedCount++;
      }
    }
  }

  return { pendingCount, dormantCount, triagedCount };
}

/** Whether a row has been changed from its initial pending state. */
export function canUndoRow(row: CookieRowState): boolean {
  return row.decision !== undefined;
}

/** Per-category summary for the group header and apply button. */
export interface CookieTriageCategorySummary {
  /** Rows whose agent suggestion is approve (any decision state) */
  approveCount: number;
  /** Rows whose agent suggestion is junk (any decision state) */
  junkCount: number;
  /** Pending rows with no telemetry in the last 30 days */
  dormantCount: number;
  /** Pending rows with an approve suggestion that can be bulk-applied */
  pendingApproveCount: number;
  /** Pending rows with a junk suggestion that can be bulk-applied */
  pendingJunkCount: number;
}

/** Derive group-header counts for one purpose category. */
export function selectCategorySummary(
  category: CookieTriageCategoryState,
): CookieTriageCategorySummary {
  let approveCount = 0;
  let junkCount = 0;
  let dormantCount = 0;
  let pendingApproveCount = 0;
  let pendingJunkCount = 0;

  for (const row of category.cookies) {
    if (row.initial.suggestion === 'approve') {
      approveCount++;
      if (row.decision === undefined) {
        pendingApproveCount++;
      }
    } else if (row.initial.suggestion === 'junk') {
      junkCount++;
      if (row.decision === undefined) {
        pendingJunkCount++;
      }
    }

    if (row.decision === undefined && isDormantCookie(row.initial)) {
      dormantCount++;
    }
  }

  return { approveCount, junkCount, dormantCount, pendingApproveCount, pendingJunkCount };
}

/** Pending rows that can be bulk-applied (approve or junk suggestion). */
export function selectAppliableCount(summary: CookieTriageCategorySummary): number {
  return summary.pendingApproveCount + summary.pendingJunkCount;
}

/** Format encounter counts for the table (e.g. `31,204`). */
export function formatEncounters(occurrences: number | undefined): string {
  if (occurrences === undefined) {
    return '—';
  }
  return occurrences.toLocaleString('en-US');
}

/** Format last-activity timestamps as relative English phrases. */
export function formatLastActivity(lastActivityAt: string | undefined, now = Date.now()): string {
  if (lastActivityAt === undefined) {
    return '—';
  }

  const then = new Date(lastActivityAt).getTime();
  if (Number.isNaN(then)) {
    return '—';
  }

  const deltaSec = Math.round((then - now) / 1000);
  const absSec = Math.abs(deltaSec);
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (absSec < 60) {
    return rtf.format(deltaSec, 'second');
  }
  if (absSec < 60 * 60) {
    return rtf.format(Math.round(deltaSec / 60), 'minute');
  }
  if (absSec < 60 * 60 * 24) {
    return rtf.format(Math.round(deltaSec / (60 * 60)), 'hour');
  }
  return rtf.format(Math.round(deltaSec / (60 * 60 * 24)), 'day');
}

/** Capitalized label for a triage suggestion in the My Read column. */
export function suggestionReadLabel(suggestion: CookieTriageSuggestion): string {
  switch (suggestion) {
    case 'approve':
      return 'Approve';
    case 'junk':
      return 'Junk';
    case 'review':
      return 'Review';
    default:
      return suggestion;
  }
}

/** Build the plain-language group summary under the purpose title. */
export function formatCategorySummaryLine(summary: CookieTriageCategorySummary): string {
  const parts: string[] = [];
  if (summary.approveCount > 0) {
    parts.push(`${summary.approveCount} to approve as-is`);
  }
  if (summary.junkCount > 0) {
    parts.push(`${summary.junkCount} to junk`);
  }
  if (summary.dormantCount > 0) {
    parts.push(`${summary.dormantCount} dormant, worth a look`);
  }
  return parts.length > 0 ? parts.join(' · ') : 'Nothing left to apply in this group';
}

/** Label for the bulk apply button reflecting pending approve/junk counts. */
export function formatApplySuggestionsLabel(summary: CookieTriageCategorySummary): string {
  const actions: string[] = [];
  if (summary.pendingApproveCount > 0) {
    actions.push(`${summary.pendingApproveCount} approve`);
  }
  if (summary.pendingJunkCount > 0) {
    actions.push(`${summary.pendingJunkCount} junk`);
  }
  if (actions.length === 0) {
    return 'Apply suggestions';
  }
  return `Apply suggestions · ${actions.join(' · ')}`;
}

function findRow(
  categories: CookieTriageCategoriesState,
  purpose: CookieTriagePurposeCategory,
  name: string,
): CookieRowState | undefined {
  return categories[purpose]?.cookies.find((row) => row.name === name);
}

function updateCategoryRow(
  category: CookieTriageCategoryState,
  name: string,
  patch: Pick<CookieRowState, 'decision'>,
): CookieTriageCategoryState {
  return {
    ...category,
    cookies: category.cookies.map((row) => (row.name === name ? { ...row, ...patch } : row)),
  };
}

/** Immutable reducer for cookie triage session state. */
export function cookieTriageReducer(
  state: CookieTriageSessionState,
  action: CookieTriageAction,
): CookieTriageSessionState {
  switch (action.type) {
    case 'decide': {
      const category = state.categories[action.purpose];
      const row = findRow(state.categories, action.purpose, action.name);
      if (!category || !row) {
        return state;
      }

      return {
        ...state,
        categories: {
          ...state.categories,
          [action.purpose]: updateCategoryRow(category, action.name, {
            decision: action.decision,
          }),
        },
      };
    }
    case 'undo': {
      const category = state.categories[action.purpose];
      const row = findRow(state.categories, action.purpose, action.name);
      if (!category || !row || row.decision === undefined) {
        return state;
      }

      return {
        ...state,
        categories: {
          ...state.categories,
          [action.purpose]: updateCategoryRow(category, action.name, { decision: undefined }),
        },
      };
    }
    case 'selectPurpose': {
      if (
        state.categories[action.purpose] === undefined ||
        state.selectedPurpose === action.purpose
      ) {
        return state;
      }

      return { ...state, selectedPurpose: action.purpose };
    }
    case 'applySuggestions': {
      const category = state.categories[action.purpose];
      if (!category) {
        return state;
      }

      let changed = false;
      const cookies = category.cookies.map((row) => {
        if (row.decision !== undefined) {
          return row;
        }
        const suggestion = row.initial.suggestion;
        if (suggestion === 'review') {
          return row;
        }
        changed = true;
        return { ...row, decision: suggestion };
      });

      if (!changed) {
        return state;
      }

      return {
        ...state,
        categories: {
          ...state.categories,
          [action.purpose]: { ...category, cookies },
        },
      };
    }
    default:
      return state;
  }
}
