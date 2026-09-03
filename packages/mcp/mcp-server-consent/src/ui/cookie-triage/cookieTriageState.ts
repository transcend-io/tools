import { COOKIE_TRIAGE_DORMANT_MS } from '../../lib/cookieTriageQuery.ts';
import type {
  CookieTriageAnalysis,
  CookieTriageDecision,
  CookieTriagePurposeOption,
  ConsentTriageType,
} from '../../lib/cookieTriageTypes.ts';
import {
  COOKIE_TRIAGE_DEFAULT_PURPOSE_SLUGS,
  COOKIE_TRIAGE_PURPOSE_LABELS,
  COOKIE_TRIAGE_PURPOSE_ORDER,
  isDefaultCookiePurposeSlug,
  isUnknownCookiePurposeSlug,
  resolvePrimaryCookiePurpose,
  type CookieTriagePurposeCategory,
} from '../../lib/resolvePrimaryCookiePurpose.ts';

export type { CookieTriageDecision, CookieTriagePurposeOption };

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
  /** Saved Notes field (`description`); updated after a successful notes persist */
  notes: string;
}

/** Live state for one purpose category bucket */
export interface CookieTriageCategoryState {
  /** Total items in this bucket (from the list API) */
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
  /**
   * Org tracking purposes for the per-row purpose select.
   * Seeded with known defaults; replaced when `consent_list_purposes` succeeds.
   */
  purposeOptions: CookieTriagePurposeOption[];
  /**
   * Whether `consent_list_purposes` has replaced the seeded default options.
   * The Custom tab stays visible until this is true and no custom slugs remain.
   */
  purposeOptionsLoaded: boolean;
  /**
   * API totalCount for all NEEDS_REVIEW items (overview Pending).
   * Undefined until the count tool call succeeds.
   */
  pendingTotal?: number;
  /**
   * API totalCount for NEEDS_REVIEW items last seen before the dormant cutoff.
   * Undefined until the count tool call succeeds.
   */
  dormantTotal?: number;
}

/** Summary counts for the overview strip */
export interface CookieTriageSummary {
  /** API totalCount for all NEEDS_REVIEW items */
  pendingCount: number;
  /** API totalCount for NEEDS_REVIEW items last seen before the dormant cutoff */
  dormantCount: number;
  /** Rows with a user decision in this session */
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
      /** Persist Notes (`description`) for one row after a successful update */
      type: 'setNotes';
      /** Primary purpose bucket the item belongs to */
      purpose: CookieTriagePurposeCategory;
      /** Cookie name or data-flow value */
      name: string;
      /** Notes text to store */
      notes: string;
    }
  | {
      /**
       * Persist tracking purposes for one row after a successful update.
       * Leaves the row on its current purpose tab until the user refreshes.
       */
      type: 'setTrackingPurposes';
      /** Purpose tab the row currently lives under */
      purpose: CookieTriagePurposeCategory;
      /** Cookie name or data-flow value */
      name: string;
      /** Assigned purpose slugs to store on the row */
      trackingPurposes: string[];
    }
  | {
      /** Replace the purpose-select options from `consent_list_purposes` */
      type: 'setPurposeOptions';
      /** Org purpose options for the select */
      purposeOptions: CookieTriagePurposeOption[];
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
      /**
       * Begin an explicit tab refresh: drop pending rows, keep decided overlays,
       * and reset pagination so the list query can be replayed.
       */
      type: 'refreshStart';
      /** Purpose tab being refreshed */
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
    }
  | {
      /** Update a purpose tab badge from a count-only list tool call */
      type: 'setCategoryCount';
      /** Purpose tab whose totalCount was fetched */
      purpose: CookieTriagePurposeCategory;
      /** API totalCount for this purpose filter */
      totalCount: number;
      /**
       * After a count-only refresh, mark the tab idle so selecting it loads rows.
       */
      deferListLoad?: boolean;
    }
  | {
      /** Store overview totals from count-only list tool calls */
      type: 'setSummaryTotals';
      /** API totalCount for all NEEDS_REVIEW items */
      pendingTotal?: number;
      /** API totalCount for dormant NEEDS_REVIEW items */
      dormantTotal?: number;
    };

/** Whether an item has had no telemetry activity in the last 30 days. */
export function isDormantCookie(cookie: CookieTriageAnalysis): boolean {
  return (
    cookie.lastActivityAt === undefined ||
    new Date(cookie.lastActivityAt).getTime() < Date.now() - COOKIE_TRIAGE_DORMANT_MS
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

/** Known default purpose options used until `consent_list_purposes` loads. */
export function defaultPurposeOptions(): CookieTriagePurposeOption[] {
  return COOKIE_TRIAGE_DEFAULT_PURPOSE_SLUGS.map((purpose) => ({
    slug: purpose,
    label: COOKIE_TRIAGE_PURPOSE_LABELS[purpose],
  }));
}

/** Non-default purpose slugs from the org purpose list (excludes Unknown). */
export function selectCustomPurposeSlugs(
  purposeOptions: readonly CookieTriagePurposeOption[],
): string[] {
  return purposeOptions
    .map((option) => option.slug)
    .filter((slug) => !isDefaultCookiePurposeSlug(slug) && !isUnknownCookiePurposeSlug(slug));
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
    purposeOptions: defaultPurposeOptions(),
    purposeOptionsLoaded: false,
  };
}

/** Ordered purpose keys shown as tabs. Custom is last and drops after purposes load with none. */
export function selectPurposes(state: CookieTriageSessionState): CookieTriagePurposeCategory[] {
  if (state.purposeOptionsLoaded && selectCustomPurposeSlugs(state.purposeOptions).length === 0) {
    return COOKIE_TRIAGE_PURPOSE_ORDER.filter((purpose) => purpose !== 'Custom');
  }
  return [...COOKIE_TRIAGE_PURPOSE_ORDER];
}

/** Count rows with a session decision (overview Triaged). */
export function selectTriagedCount(categories: CookieTriageCategoriesState): number {
  let triagedCount = 0;
  for (const category of Object.values(categories)) {
    for (const row of category.cookies) {
      if (row.decision !== undefined) {
        triagedCount++;
      }
    }
  }
  return triagedCount;
}

/**
 * Overview KPIs: pending/dormant from API count calls, triaged from session decisions.
 */
export function selectSummary(state: CookieTriageSessionState): CookieTriageSummary {
  return {
    pendingCount: state.pendingTotal ?? 0,
    dormantCount: state.dormantTotal ?? 0,
    triagedCount: selectTriagedCount(state.categories),
  };
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

/** Past-tense tag label for a committed triage decision. */
export function decisionReadLabel(decision: CookieTriageDecision): string {
  switch (decision) {
    case 'approve':
      return 'Approved';
    case 'junk':
      return 'Junked';
    case 'review':
      return 'Review';
    default:
      return decision;
  }
}

/**
 * Build the chat message that asks the host LLM for a triage recommendation
 * on one cookie or data-flow row.
 */
export function buildAskOpinionPrompt(options: {
  /** Whether this session is cookies or data flows */
  triageType: ConsentTriageType;
  /** Purpose tab the row is shown under */
  purpose: CookieTriagePurposeCategory;
  /** Row snapshot to include in the prompt */
  item: CookieTriageAnalysis;
}): string {
  const { triageType, purpose, item } = options;
  const itemNoun = triageType === 'cookies' ? 'cookie' : 'data flow';
  const purposes =
    item.trackingPurposes && item.trackingPurposes.length > 0
      ? item.trackingPurposes.join(', ')
      : 'none';
  const dormant = isDormantCookie(item);

  const lines = [
    `Please recommend a triage action for this ${itemNoun} needing review.`,
    '',
    `Name: ${item.name}`,
    `Service: ${item.service ?? 'Unknown'}`,
    `Assigned purposes: ${purposes}`,
    `Primary purpose tab: ${purpose}`,
    `Encounters: ${formatEncounters(item.occurrences)}`,
    `Last activity: ${formatLastActivity(item.lastActivityAt)}`,
    `Dormant (no activity in 30+ days): ${dormant ? 'yes' : 'no'}`,
    '',
    'Recommend one of: approve, junk, or review.',
    'If approve, also recommend tracking purpose slug(s) and a one-sentence reason citing evidence.',
    'Keep the response short so I can apply the decision in the triage UI.',
  ];

  return lines.join('\n');
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
  patch: Partial<Pick<CookieRowState, 'decision' | 'notes' | 'initial'>>,
): CookieTriageCategoryState {
  return {
    ...category,
    cookies: category.cookies.map((row) => (row.name === name ? { ...row, ...patch } : row)),
  };
}

/**
 * Assigned purpose slugs for the row multi-select (empty when none assigned).
 */
export function selectRowPurposeSlugs(row: CookieRowState): string[] {
  return [...(row.initial.trackingPurposes ?? [])];
}

function samePurposeList(left: string[] | undefined, right: string[]): boolean {
  const current = left ?? [];
  if (current.length !== right.length) {
    return false;
  }
  const currentSet = new Set(current);
  return right.every((slug) => currentSet.has(slug));
}

function addRowKeys(keys: Set<string>, row: Pick<CookieRowState, 'name' | 'initial'>): void {
  keys.add(row.name);
  if (row.initial.id !== undefined) {
    keys.add(row.initial.id);
  }
}

function addItemKeys(keys: Set<string>, item: CookieTriageAnalysis): void {
  keys.add(item.name);
  if (item.id !== undefined) {
    keys.add(item.id);
  }
}

function sessionRowKeys(categories: CookieTriageCategoriesState): Set<string> {
  const keys = new Set<string>();
  for (const category of Object.values(categories)) {
    for (const row of category.cookies) {
      addRowKeys(keys, row);
    }
  }
  return keys;
}

function categoryRowKeys(category: CookieTriageCategoryState): Set<string> {
  const keys = new Set<string>();
  for (const row of category.cookies) {
    addRowKeys(keys, row);
  }
  return keys;
}

function itemMatchesRow(item: CookieTriageAnalysis, row: CookieRowState): boolean {
  return row.name === item.name || (item.id !== undefined && row.initial.id === item.id);
}

function toPendingRow(item: CookieTriageAnalysis): CookieRowState {
  return {
    name: item.name,
    initial: structuredClone(item),
    notes: item.description ?? '',
  };
}

/**
 * Whether a list item belongs on this purpose tab.
 *
 * Custom matches the API filter: any non-default (non-Unknown) purpose slug,
 * even when a default purpose is also assigned.
 */
function itemBelongsOnPurposeTab(
  purpose: CookieTriagePurposeCategory,
  trackingPurposes: string[] | undefined,
): boolean {
  if (purpose === 'Custom') {
    return (trackingPurposes ?? []).some(
      (slug) =>
        slug.trim().length > 0 &&
        !isDefaultCookiePurposeSlug(slug) &&
        !isUnknownCookiePurposeSlug(slug),
    );
  }
  return resolvePrimaryCookiePurpose(trackingPurposes) === purpose;
}

/**
 * Split a list page into rows that revive a local decided overlay (API says
 * NEEDS_REVIEW again) versus brand-new claims for this tab.
 *
 * Custom dedupes only within its own tab so mixed-purpose cookies can appear
 * both under a default tab and under Custom (matching the API count).
 */
export function claimPageItems(
  categories: CookieTriageCategoriesState,
  purpose: CookieTriagePurposeCategory,
  items: readonly CookieTriageAnalysis[],
): {
  /** Fresh pending rows not already in the session */
  claimed: CookieTriageAnalysis[];
  /** Decided overlays on this tab that should be replaced by API pending rows */
  revived: CookieTriageAnalysis[];
} {
  const category = categories[purpose];
  const decided = category.cookies.filter((row) => row.decision !== undefined);
  const remainingDecided = [...decided];
  const keys = purpose === 'Custom' ? categoryRowKeys(category) : sessionRowKeys(categories);
  const claimed: CookieTriageAnalysis[] = [];
  const revived: CookieTriageAnalysis[] = [];

  for (const item of items) {
    if (!itemBelongsOnPurposeTab(purpose, item.trackingPurposes)) {
      continue;
    }

    const decidedIndex = remainingDecided.findIndex((row) => itemMatchesRow(item, row));
    if (decidedIndex >= 0) {
      const [removed] = remainingDecided.splice(decidedIndex, 1);
      if (removed !== undefined) {
        revived.push(item);
      }
      continue;
    }

    if (keys.has(item.name) || (item.id !== undefined && keys.has(item.id))) {
      continue;
    }

    claimed.push(item);
    addItemKeys(keys, item);
  }

  return { claimed, revived };
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
    case 'setNotes': {
      const category = state.categories[action.purpose];
      const row = findRow(state.categories, action.purpose, action.name);
      if (!row || row.notes === action.notes) {
        return state;
      }

      return {
        ...state,
        categories: {
          ...state.categories,
          [action.purpose]: updateCategoryRow(category, action.name, { notes: action.notes }),
        },
      };
    }
    case 'setTrackingPurposes': {
      const category = state.categories[action.purpose];
      const row = findRow(state.categories, action.purpose, action.name);
      if (!row || samePurposeList(row.initial.trackingPurposes, action.trackingPurposes)) {
        return state;
      }

      return {
        ...state,
        categories: {
          ...state.categories,
          [action.purpose]: updateCategoryRow(category, action.name, {
            initial: {
              ...row.initial,
              trackingPurposes: [...action.trackingPurposes],
            },
          }),
        },
      };
    }
    case 'setPurposeOptions': {
      if (action.purposeOptions.length === 0) {
        return state;
      }
      const purposeOptionsLoaded = true;
      const selectedPurpose =
        state.selectedPurpose === 'Custom' &&
        selectCustomPurposeSlugs(action.purposeOptions).length === 0
          ? 'Unknown'
          : state.selectedPurpose;
      return {
        ...state,
        purposeOptions: action.purposeOptions,
        purposeOptionsLoaded,
        selectedPurpose,
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
    case 'refreshStart': {
      const category = state.categories[action.purpose];
      if (category.loadStatus === 'loading') {
        return state;
      }

      const decided = category.cookies.filter((row) => row.decision !== undefined);

      return {
        ...state,
        categories: {
          ...state.categories,
          [action.purpose]: {
            ...category,
            cookies: decided,
            nextOffset: 0,
            hasNextPage: true,
            loadStatus: 'loading',
            loadError: undefined,
            totalCount: category.totalCount,
          },
        },
      };
    }
    case 'appendPage': {
      const category = state.categories[action.purpose];
      const { claimed, revived } = claimPageItems(state.categories, action.purpose, action.items);

      let cookies = category.cookies;
      if (revived.length > 0 || claimed.length > 0) {
        const revivedKeys = new Set<string>();
        for (const item of revived) {
          addItemKeys(revivedKeys, item);
        }

        const kept = category.cookies.filter((row) => {
          if (row.decision === undefined) {
            return true;
          }
          return (
            !revivedKeys.has(row.name) &&
            (row.initial.id === undefined || !revivedKeys.has(row.initial.id))
          );
        });

        cookies = [...kept, ...revived.map(toPendingRow), ...claimed.map(toPendingRow)];
      }

      const totalCount = action.totalCount ?? category.totalCount;

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
    case 'setCategoryCount': {
      const category = state.categories[action.purpose];
      return {
        ...state,
        categories: {
          ...state.categories,
          [action.purpose]: {
            ...category,
            totalCount: action.totalCount,
            ...(action.deferListLoad ? { loadStatus: 'idle' as const, loadError: undefined } : {}),
          },
        },
      };
    }
    case 'setSummaryTotals': {
      return {
        ...state,
        ...(action.pendingTotal !== undefined ? { pendingTotal: action.pendingTotal } : {}),
        ...(action.dormantTotal !== undefined ? { dormantTotal: action.dormantTotal } : {}),
      };
    }
    default:
      return state;
  }
}
