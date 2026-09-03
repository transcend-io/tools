import type {
  CookieTriageAnalysis,
  CookieTriageDecision,
  ConsentTriageType,
} from '../../lib/cookieTriageTypes.ts';
import {
  COOKIE_TRIAGE_PURPOSE_ORDER,
  resolvePrimaryCookiePurpose,
  type CookieTriagePurposeCategory,
} from '../../lib/resolvePrimaryCookiePurpose.ts';

export type { CookieTriageDecision };

/** Per-tab list fetch status */
export type CookieTriageLoadStatus = 'idle' | 'loading' | 'ready' | 'error';

/** Live state for one cookie/data-flow row within a purpose category */
export interface CookieRowState {
  /** Stable row key (cookie name or data-flow value) */
  name: string;
  /** Cloned snapshot of the item at load time; used as the undo reference */
  initial: CookieTriageAnalysis;
  /** Current user decision; undefined means still pending */
  decision?: CookieTriageDecision;
}

/** Live state for one purpose category bucket */
export interface CookieTriageCategoryState {
  /** Total items in this bucket (API total, or loaded count for Other) */
  totalCount: number;
  /** Items shown in this category */
  cookies: CookieRowState[];
  /** List fetch status for this tab */
  loadStatus: CookieTriageLoadStatus;
  /** Error message from the most recent failed list call, if any */
  loadError?: string;
  /** Offset of the next list page (API rows received for this query) */
  nextOffset: number;
  /** Whether another list page exists for this query */
  hasNextPage: boolean;
}

/** Purpose-keyed category state for the session */
export type CookieTriageCategoriesState = Record<
  CookieTriagePurposeCategory,
  CookieTriageCategoryState
>;

/** Session state for the loaded cookie triage view */
export interface CookieTriageSessionState {
  /** Whether this session is cookies or data flows */
  triageType: ConsentTriageType;
  /** Purpose-keyed categories with live rows */
  categories: CookieTriageCategoriesState;
  /** Purpose tab currently selected in the triage UI */
  selectedPurpose: CookieTriagePurposeCategory;
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
      /** Record a triage decision for one item */
      type: 'decide';
      /** Primary purpose bucket the item belongs to */
      purpose: CookieTriagePurposeCategory;
      /** Cookie name or data-flow value */
      name: string;
      /** Decision to apply */
      decision: CookieTriageDecision;
    }
  | {
      /** Revert one row to its initial pending state */
      type: 'undo';
      /** Primary purpose bucket the item belongs to */
      purpose: CookieTriagePurposeCategory;
      /** Cookie name or data-flow value */
      name: string;
    }
  | {
      /** Select the active purpose tab */
      type: 'selectPurpose';
      /** Purpose category to show */
      purpose: CookieTriagePurposeCategory;
    }
  | {
      /** Mark a purpose tab as fetching a list page */
      type: 'loadStart';
      /** Purpose tab being loaded */
      purpose: CookieTriagePurposeCategory;
    }
  | {
      /** Merge a list page into a purpose tab */
      type: 'appendPage';
      /** Purpose tab the page was fetched for */
      purpose: CookieTriagePurposeCategory;
      /** Projected rows from the list tool (unclaimed; may include other primaries) */
      items: CookieTriageAnalysis[];
      /** Number of API rows in this page (drives nextOffset) */
      fetchedCount: number;
      /** API totalCount for this filter, when known */
      totalCount?: number;
      /** Whether the list tool reported another page */
      hasNextPage: boolean;
    }
  | {
      /** Record a failed list fetch for a purpose tab */
      type: 'loadError';
      /** Purpose tab that failed */
      purpose: CookieTriagePurposeCategory;
      /** Error message from the tool */
      error: string;
    };

const DORMANT_MS = 1000 * 60 * 60 * 24 * 30;

/** Whether an item has had no telemetry activity in the last 30 days. */
export function isDormantCookie(cookie: CookieTriageAnalysis): boolean {
  return (
    cookie.lastActivityAt === undefined ||
    new Date(cookie.lastActivityAt).getTime() < Date.now() - DORMANT_MS
  );
}

function emptyCategory(): CookieTriageCategoryState {
  return {
    totalCount: 0,
    cookies: [],
    loadStatus: 'idle',
    nextOffset: 0,
    hasNextPage: true,
  };
}

/** Build an empty session with every purpose tab seeded. */
export function createEmptySession(triageType: ConsentTriageType): CookieTriageSessionState {
  const categories = Object.fromEntries(
    COOKIE_TRIAGE_PURPOSE_ORDER.map((purpose) => [purpose, emptyCategory()]),
  ) as CookieTriageCategoriesState;

  return {
    triageType,
    categories,
    selectedPurpose: 'Essential',
  };
}

/** Ordered purpose keys shown as tabs (always the full set). */
export function selectPurposes(): CookieTriagePurposeCategory[] {
  return [...COOKIE_TRIAGE_PURPOSE_ORDER];
}

/** Aggregate pending / dormant / triaged counts across all purpose categories. */
export function selectSummary(categories: CookieTriageCategoriesState): CookieTriageSummary {
  let pendingCount = 0;
  let dormantCount = 0;
  let triagedCount = 0;

  for (const category of Object.values(categories)) {
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

/** Per-category summary for the group header. */
export interface CookieTriageCategorySummary {
  /** Pending rows in this category */
  pendingCount: number;
  /** Pending rows with no telemetry in the last 30 days */
  dormantCount: number;
  /** Rows with a user decision in this category */
  triagedCount: number;
}

/** Derive group-header counts for one purpose category. */
export function selectCategorySummary(
  category: CookieTriageCategoryState,
): CookieTriageCategorySummary {
  let pendingCount = 0;
  let dormantCount = 0;
  let triagedCount = 0;

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

  return { pendingCount, dormantCount, triagedCount };
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

/** Capitalized label for a triage decision. */
export function decisionReadLabel(decision: CookieTriageDecision): string {
  switch (decision) {
    case 'approve':
      return 'Approve';
    case 'junk':
      return 'Junk';
    case 'review':
      return 'Review';
    default:
      return decision;
  }
}

/** Build the plain-language group summary under the purpose title. */
export function formatCategorySummaryLine(summary: CookieTriageCategorySummary): string {
  const parts: string[] = [];
  if (summary.pendingCount > 0) {
    parts.push(`${summary.pendingCount} pending`);
  }
  if (summary.dormantCount > 0) {
    parts.push(`${summary.dormantCount} dormant, worth a look`);
  }
  if (summary.triagedCount > 0) {
    parts.push(`${summary.triagedCount} decided`);
  }
  return parts.length > 0 ? parts.join(' · ') : 'Nothing left in this group';
}

function findRow(
  categories: CookieTriageCategoriesState,
  purpose: CookieTriagePurposeCategory,
  name: string,
): CookieRowState | undefined {
  return categories[purpose].cookies.find((row) => row.name === name);
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

function sessionRowKeys(categories: CookieTriageCategoriesState): Set<string> {
  const keys = new Set<string>();
  for (const category of Object.values(categories)) {
    for (const row of category.cookies) {
      keys.add(row.name);
      if (row.initial.id !== undefined) {
        keys.add(row.initial.id);
      }
    }
  }
  return keys;
}

/** Rows from a list page that belong on this tab and are not already in the session. */
export function claimPageItems(
  categories: CookieTriageCategoriesState,
  purpose: CookieTriagePurposeCategory,
  items: readonly CookieTriageAnalysis[],
): CookieTriageAnalysis[] {
  const keys = sessionRowKeys(categories);
  const claimed: CookieTriageAnalysis[] = [];

  for (const item of items) {
    if (resolvePrimaryCookiePurpose(item.trackingPurposes) !== purpose) {
      continue;
    }
    if (keys.has(item.name) || (item.id !== undefined && keys.has(item.id))) {
      continue;
    }
    claimed.push(item);
    keys.add(item.name);
    if (item.id !== undefined) {
      keys.add(item.id);
    }
  }

  return claimed;
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
      if (!row) {
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
      if (!row || row.decision === undefined) {
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
        !COOKIE_TRIAGE_PURPOSE_ORDER.includes(action.purpose) ||
        state.selectedPurpose === action.purpose
      ) {
        return state;
      }

      return { ...state, selectedPurpose: action.purpose };
    }
    case 'loadStart': {
      const category = state.categories[action.purpose];
      if (category.loadStatus === 'loading') {
        return state;
      }

      return {
        ...state,
        categories: {
          ...state.categories,
          [action.purpose]: {
            ...category,
            loadStatus: 'loading',
            loadError: undefined,
          },
        },
      };
    }
    case 'appendPage': {
      const category = state.categories[action.purpose];
      const claimed = claimPageItems(state.categories, action.purpose, action.items);
      const cookies =
        claimed.length === 0
          ? category.cookies
          : [
              ...category.cookies,
              ...claimed.map((item) => ({
                name: item.name,
                initial: structuredClone(item),
              })),
            ];

      const totalCount =
        action.purpose === 'NoPurpose'
          ? cookies.length
          : (action.totalCount ?? category.totalCount);

      return {
        ...state,
        categories: {
          ...state.categories,
          [action.purpose]: {
            ...category,
            cookies,
            totalCount,
            nextOffset: category.nextOffset + action.fetchedCount,
            hasNextPage: action.hasNextPage,
            loadStatus: 'ready',
            loadError: undefined,
          },
        },
      };
    }
    case 'loadError': {
      const category = state.categories[action.purpose];
      return {
        ...state,
        categories: {
          ...state.categories,
          [action.purpose]: {
            ...category,
            loadStatus: 'error',
            loadError: action.error,
          },
        },
      };
    }
    default:
      return state;
  }
}
