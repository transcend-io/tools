import { createContext, useContext } from 'react';

import type { ConsentTriageType, CookieTriagePurposeOption } from '../../lib/cookieTriageTypes.ts';
import type { CookieTriagePurposeCategory } from '../../lib/resolvePrimaryCookiePurpose.ts';
import type { AppliedSuggestionsByPurpose } from './cookieTriagePersist.ts';
import type {
  CookieTriageCategoryState,
  CookieTriageDecision,
  CookieTriageLoadStatus,
  CookieTriageSummary,
} from './cookieTriageState.ts';

/** Bound action helpers for the triage UI. */
export interface CookieTriageActions {
  /**
   * Persist an approve/junk decision via the update tool, then record it locally.
   * Rejects if the tool call fails (local state is left unchanged).
   */
  decide: (
    purpose: CookieTriagePurposeCategory,
    name: string,
    decision: CookieTriageDecision,
  ) => Promise<void>;
  /**
   * Apply static approve/junk suggestions for all undecided loaded rows in a
   * purpose tab in one update-tool call. Rejects if the tool call fails (local
   * state is left unchanged). Successful names are stored for
   * {@link undoSuggestions}.
   */
  applySuggestions: (purpose: CookieTriagePurposeCategory) => Promise<void>;
  /**
   * Undo the last successful {@link applySuggestions} batch for a purpose tab
   * in one update-tool call. Rejects if the tool call fails (local state is
   * left unchanged).
   */
  undoSuggestions: (purpose: CookieTriagePurposeCategory) => Promise<void>;
  /**
   * Restore NEEDS_REVIEW via the update tool, then clear the local decision.
   * Rejects if the tool call fails (local state is left unchanged).
   */
  undo: (purpose: CookieTriagePurposeCategory, name: string) => Promise<void>;
  /**
   * Persist Notes (`description`) via the update tool, then update local row state.
   * Rejects if the tool call fails (local state is left unchanged).
   */
  updateNotes: (purpose: CookieTriagePurposeCategory, name: string, notes: string) => Promise<void>;
  /**
   * Persist tracking purposes via the update tool, then update local row state
   * in place (the row stays on its current purpose tab until refresh).
   * Rejects if the tool call fails (local state is left unchanged).
   */
  updatePurpose: (
    purpose: CookieTriagePurposeCategory,
    name: string,
    trackingPurposes: string[],
  ) => Promise<void>;
  /** Switch the active purpose tab */
  selectPurpose: (purpose: CookieTriagePurposeCategory) => void;
  /** Fetch the next page for a purpose tab (or retry after an error) */
  loadMore: (purpose: CookieTriagePurposeCategory) => void;
  /**
   * Refresh every purpose tab: full list replay for the active tab, count-only
   * for the rest (rows reload when those tabs are selected). Keeps decided
   * rows as undoable overlays.
   */
  refresh: () => void;
  /**
   * Ask the host LLM for an approve/junk/review recommendation on one row.
   * Resolves when the host accepts the chat message (or rejects / errors).
   */
  askOpinion: (purpose: CookieTriagePurposeCategory, name: string) => Promise<void>;
  /**
   * Permanently delete a cookie or data flow via the matching delete tool,
   * then remove it from local state.
   */
  remove: (purpose: CookieTriagePurposeCategory, name: string) => Promise<void>;
}

/** Rarely changing session identity for rows and copy. */
export interface CookieTriageMeta {
  /** Cookies vs data flows for this session */
  triageType: ConsentTriageType;
  /** Admin dashboard base URL for deep links */
  dashboardUrl: string;
  /** Org tracking purposes for the per-row purpose select */
  purposeOptions: CookieTriagePurposeOption[];
}

/** Badge + load chrome for one purpose tab. */
export interface CookieTriageTabChrome {
  /** Purpose tab id */
  id: CookieTriagePurposeCategory;
  /** API totalCount for this filter */
  totalCount: number;
  /** True while the badge should shimmer */
  countBusy: boolean;
  /** List fetch status for this tab */
  loadStatus: CookieTriageLoadStatus;
}

/** Tab strip and refresh chrome; must not change when a single row is edited. */
export interface CookieTriageChrome {
  /** Purpose tab currently selected */
  selectedPurpose: CookieTriagePurposeCategory;
  /** Ordered purposes shown as tabs */
  purposes: CookieTriagePurposeCategory[];
  /** Per-tab badge stats in tab order */
  tabs: CookieTriageTabChrome[];
  /** True while any purpose tab list is loading */
  isRefreshing: boolean;
}

/** Pending permanent-delete confirm owned by the loaded view. */
export interface CookieTriageDeleteRequest {
  /** Purpose tab the row lives under */
  purpose: CookieTriagePurposeCategory;
  /** Cookie name or data-flow value */
  name: string;
  /** Display name shown in the confirm title */
  itemLabel: string;
}

export const CookieTriageMetaContext = createContext<CookieTriageMeta | null>(null);
export const CookieTriageSummaryContext = createContext<CookieTriageSummary | null>(null);
export const CookieTriageChromeContext = createContext<CookieTriageChrome | null>(null);
export const CookieTriageActiveCategoryContext = createContext<CookieTriageCategoryState | null>(
  null,
);
export const CookieTriageActionsContext = createContext<CookieTriageActions | null>(null);
export const AppliedSuggestionsContext = createContext<AppliedSuggestionsByPurpose>({});
export const CookieTriageDeleteRequestContext = createContext<
  ((target: CookieTriageDeleteRequest) => void) | null
>(null);

/** Rarely changing triage type and purpose-select options. */
export function useCookieTriageMeta(): CookieTriageMeta {
  const meta = useContext(CookieTriageMetaContext);
  if (!meta) {
    throw new Error('useCookieTriageMeta must be used within CookieTriageProvider');
  }
  return meta;
}

/** Aggregate pending / dormant / triaged counts. */
export function useCookieTriageSummary(): CookieTriageSummary {
  const summary = useContext(CookieTriageSummaryContext);
  if (!summary) {
    throw new Error('useCookieTriageSummary must be used within CookieTriageProvider');
  }
  return summary;
}

/** Tab strip selection, badges, and refresh busy. */
export function useCookieTriageChrome(): CookieTriageChrome {
  const chrome = useContext(CookieTriageChromeContext);
  if (!chrome) {
    throw new Error('useCookieTriageChrome must be used within CookieTriageProvider');
  }
  return chrome;
}

/** Category state for the selected purpose tab. */
export function useCookieTriageActiveCategory(): CookieTriageCategoryState {
  const category = useContext(CookieTriageActiveCategoryContext);
  if (!category) {
    throw new Error('useCookieTriageActiveCategory must be used within CookieTriageProvider');
  }
  return category;
}

/** Bound action helpers for the triage UI. */
export function useCookieTriageActions(): CookieTriageActions {
  const actions = useContext(CookieTriageActionsContext);
  if (!actions) {
    throw new Error('useCookieTriageActions must be used within CookieTriageProvider');
  }
  return actions;
}

/** Ordered purposes shown as tabs. */
export function useCookieTriagePurposes(): CookieTriagePurposeCategory[] {
  return useCookieTriageChrome().purposes;
}

/** Currently selected purpose tab. */
export function useSelectedPurpose(): CookieTriagePurposeCategory {
  return useCookieTriageChrome().selectedPurpose;
}

/** Names successfully applied by the last Apply suggestions for a purpose tab. */
export function useAppliedSuggestionNames(purpose: CookieTriagePurposeCategory): readonly string[] {
  return useContext(AppliedSuggestionsContext)[purpose] ?? [];
}

/** Open the page-level delete confirm for one row. */
export function useRequestDelete(): (target: CookieTriageDeleteRequest) => void {
  const requestDelete = useContext(CookieTriageDeleteRequestContext);
  if (!requestDelete) {
    throw new Error('useRequestDelete must be used within CookieTriageLoaded');
  }
  return requestDelete;
}
