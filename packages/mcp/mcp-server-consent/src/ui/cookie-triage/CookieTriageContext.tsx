import type { App } from '@modelcontextprotocol/ext-apps';
import { useTool } from '@transcend-io/mcp-server-base/ui';
import { createContext, useContext, useEffect, useReducer, useRef, type ReactNode } from 'react';

import { COOKIE_TRIAGE_AUTOFILL_PAGES, buildTriageListArgs } from '../../lib/cookieTriageQuery.ts';
import type { ConsentTriageType } from '../../lib/cookieTriageTypes.ts';
import { projectListNodeForTriage } from '../../lib/projectTriageItem.ts';
import {
  COOKIE_TRIAGE_PURPOSE_ORDER,
  type CookieTriagePurposeCategory,
} from '../../lib/resolvePrimaryCookiePurpose.ts';
import {
  cookieTriageReducer,
  createEmptySession,
  selectPurposes,
  selectSummary,
  type CookieTriageAction,
  type CookieTriageCategoriesState,
  type CookieTriageCategoryState,
  type CookieTriageDecision,
  type CookieTriageSessionState,
  type CookieTriageSummary,
} from './cookieTriageState.ts';

const LIST_TOOL_NAME = {
  cookies: 'consent_list_cookies',
  data_flows: 'consent_list_data_flows',
} as const;

const CookieTriageStateContext = createContext<CookieTriageSessionState | null>(null);

/** Bound action helpers for the triage UI. */
export interface CookieTriageActions {
  /** Record a decision for one row */
  decide: (
    purpose: CookieTriagePurposeCategory,
    name: string,
    decision: CookieTriageDecision,
  ) => void;
  /** Clear the decision on one row */
  undo: (purpose: CookieTriagePurposeCategory, name: string) => void;
  /** Switch the active purpose tab */
  selectPurpose: (purpose: CookieTriagePurposeCategory) => void;
  /** Fetch the next page for a purpose tab (or retry after an error) */
  loadMore: (purpose: CookieTriagePurposeCategory) => void;
}

const CookieTriageActionsContext = createContext<CookieTriageActions | null>(null);

interface CookieTriageProviderProps {
  /** Cookies vs data flows for this session */
  triageType: ConsentTriageType;
  /** Connected MCP App used to call list tools */
  app: App | null;
  /** Triage UI subtree */
  children: ReactNode;
}

/** Provides cookie triage session state and list fetching to the view tree. */
export function CookieTriageProvider({ triageType, app, children }: CookieTriageProviderProps) {
  const [state, dispatch] = useReducer(cookieTriageReducer, triageType, createEmptySession);
  const listTool = useTool(app, LIST_TOOL_NAME[triageType]);

  const stateRef = useRef(state);
  stateRef.current = state;
  const callRef = useRef(listTool.call);
  callRef.current = listTool.call;
  const inFlightRef = useRef(new Set<CookieTriagePurposeCategory>());

  async function fetchPurposePages(
    purpose: CookieTriagePurposeCategory,
    mode: 'initial' | 'more',
  ): Promise<void> {
    if (!app || inFlightRef.current.has(purpose)) {
      return;
    }

    let session = stateRef.current;
    const category = session.categories[purpose];
    if (
      mode === 'initial' &&
      (category.loadStatus === 'ready' || category.loadStatus === 'loading')
    ) {
      return;
    }
    if (mode === 'more' && category.loadStatus === 'loading') {
      return;
    }
    if (mode === 'more' && !category.hasNextPage && category.loadStatus !== 'error') {
      return;
    }

    inFlightRef.current.add(purpose);
    session = cookieTriageReducer(session, { type: 'loadStart', purpose });
    dispatch({ type: 'loadStart', purpose });
    stateRef.current = session;

    const lengthBefore = session.categories[purpose].cookies.length;
    const maxPages = 1 + COOKIE_TRIAGE_AUTOFILL_PAGES;

    try {
      for (let pages = 0; pages < maxPages; pages += 1) {
        const offset = session.categories[purpose].nextOffset;
        const result = await callRef.current(buildTriageListArgs(triageType, purpose, offset));
        if (result.error !== undefined) {
          const loadError: CookieTriageAction = {
            type: 'loadError',
            purpose,
            error: result.error,
          };
          session = cookieTriageReducer(session, loadError);
          dispatch(loadError);
          stateRef.current = session;
          return;
        }

        const nodes = Array.isArray(result.data) ? result.data : [];
        const items = nodes
          .map((node) => projectListNodeForTriage(triageType, node))
          .filter((item): item is NonNullable<typeof item> => item !== undefined);

        const appendPage: CookieTriageAction = {
          type: 'appendPage',
          purpose,
          items,
          fetchedCount: nodes.length,
          ...(result.totalCount !== undefined ? { totalCount: result.totalCount } : {}),
          hasNextPage: result.hasNextPage ?? false,
        };
        session = cookieTriageReducer(session, appendPage);
        dispatch(appendPage);
        stateRef.current = session;

        const added = session.categories[purpose].cookies.length - lengthBefore;
        if (added > 0 || !session.categories[purpose].hasNextPage) {
          return;
        }
      }
    } finally {
      inFlightRef.current.delete(purpose);
    }
  }

  const fetchRef = useRef(fetchPurposePages);
  fetchRef.current = fetchPurposePages;

  useEffect(() => {
    if (!app) {
      return undefined;
    }

    let cancelled = false;

    void (async () => {
      for (const purpose of COOKIE_TRIAGE_PURPOSE_ORDER) {
        if (cancelled) {
          return;
        }
        await fetchRef.current(purpose, 'initial');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [app, triageType]);

  useEffect(() => {
    if (!app) {
      return;
    }
    void fetchRef.current(state.selectedPurpose, 'initial');
  }, [app, state.selectedPurpose]);

  const actions: CookieTriageActions = {
    decide: (purpose, name, decision) => dispatch({ type: 'decide', purpose, name, decision }),
    undo: (purpose, name) => dispatch({ type: 'undo', purpose, name }),
    selectPurpose: (purpose) => dispatch({ type: 'selectPurpose', purpose }),
    loadMore: (purpose) => {
      void fetchRef.current(purpose, 'more');
    },
  };

  return (
    <CookieTriageStateContext.Provider value={state}>
      <CookieTriageActionsContext.Provider value={actions}>
        {children}
      </CookieTriageActionsContext.Provider>
    </CookieTriageStateContext.Provider>
  );
}

/** Full session state for the loaded triage view. */
export function useCookieTriageState(): CookieTriageSessionState {
  const state = useContext(CookieTriageStateContext);
  if (!state) {
    throw new Error('useCookieTriageState must be used within CookieTriageProvider');
  }
  return state;
}

/** Bound action helpers for the triage UI. */
export function useCookieTriageActions(): CookieTriageActions {
  const actions = useContext(CookieTriageActionsContext);
  if (!actions) {
    throw new Error('useCookieTriageActions must be used within CookieTriageProvider');
  }
  return actions;
}

/** Aggregate pending / dormant / triaged counts. */
export function useCookieTriageSummary(): CookieTriageSummary {
  const { categories } = useCookieTriageState();
  return selectSummary(categories);
}

/** Purpose-keyed category map. */
export function useCookieTriageCategories(): CookieTriageCategoriesState {
  return useCookieTriageState().categories;
}

/** Ordered purposes shown as tabs. */
export function useCookieTriagePurposes(): CookieTriagePurposeCategory[] {
  return selectPurposes();
}

/** Currently selected purpose tab. */
export function useSelectedPurpose(): CookieTriagePurposeCategory {
  return useCookieTriageState().selectedPurpose;
}

/** Category state for one purpose tab. */
export function useCookieTriageCategory(
  purpose: CookieTriagePurposeCategory,
): CookieTriageCategoryState {
  return useCookieTriageState().categories[purpose];
}

/** Category state for the selected purpose tab. */
export function useSelectedCategory(): CookieTriageCategoryState {
  const { categories, selectedPurpose } = useCookieTriageState();
  return categories[selectedPurpose];
}

/** Whether the given row currently has a decision that can be undone. */
export function useCanUndoRow(purpose: CookieTriagePurposeCategory, name: string): boolean {
  const row = useCookieTriageCategory(purpose).cookies.find((candidate) => candidate.name === name);
  return row?.decision !== undefined;
}
