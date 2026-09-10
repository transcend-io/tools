import type { App } from '@modelcontextprotocol/ext-apps';
import { useTool } from '@transcend-io/mcp-server-base/ui';
import { useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';

import { CookieTriagePurposeCategory } from '../../lib/cookieTriageConfig.ts';
import { ConsentTriageType } from '../../lib/cookieTriageTypes.ts';
import {
  projectPurposeOptions,
  type ConsentPurposeListNode,
} from '../../lib/projectPurposeOptions.ts';
import {
  AppliedSuggestionsContext,
  CookieTriageActionsContext,
  CookieTriageActiveCategoryContext,
  CookieTriageChromeContext,
  CookieTriageMetaContext,
  CookieTriageSummaryContext,
  type CookieTriageActions,
  type CookieTriageChrome,
  type CookieTriageMeta,
} from './CookieTriageContext.tsx';
import { createCookieTriageFetch, initialCountPurposes } from './cookieTriageFetch.ts';
import {
  createCookieTriagePersist,
  dispatchAndSync,
  type AppliedSuggestionsByPurpose,
} from './cookieTriagePersist.ts';
import {
  buildAskOpinionPrompt,
  CookieTriageLoadStatus,
  cookieTriageReducer,
  createEmptySession,
  getCategory,
  selectCustomPurposeSlugs,
  selectPurposes,
  selectTriagedCount,
  type CookieTriageSessionState,
  type CookieTriageSummary,
} from './cookieTriageState.ts';

const LIST_TOOL_NAME = {
  [ConsentTriageType.Cookies]: 'consent_list_cookies',
  [ConsentTriageType.DataFlows]: 'consent_list_data_flows',
} as const;

const UPDATE_TOOL_NAME = {
  [ConsentTriageType.Cookies]: 'consent_update_cookies',
  [ConsentTriageType.DataFlows]: 'consent_update_data_flows',
} as const;

/** App-only permanent delete tools, keyed by triage type. */
const DELETE_TOOL_NAME = {
  [ConsentTriageType.Cookies]: 'consent_delete_cookies',
  [ConsentTriageType.DataFlows]: 'consent_delete_data_flows',
} as const;

const PURPOSES_TOOL_NAME = 'consent_list_purposes';

interface CookieTriageProviderProps {
  /** Cookies vs data flows for this session */
  triageType: ConsentTriageType;
  /** Connected MCP App used to call list tools */
  app: App | null;
  /** Triage UI subtree */
  children: ReactNode;
}

function projectChrome(state: CookieTriageSessionState): CookieTriageChrome {
  const purposes = selectPurposes(state);
  return {
    selectedPurpose: state.selectedPurpose,
    purposes,
    isRefreshing: Object.values(state.categories).some(
      (category) => category.loadStatus === CookieTriageLoadStatus.Loading,
    ),
    tabs: purposes.map((purpose) => {
      const category = getCategory(state.categories, purpose);
      return {
        id: purpose,
        totalCount: category.totalCount,
        countBusy:
          category.countBusy === true || category.loadStatus === CookieTriageLoadStatus.Loading,
        loadStatus: category.loadStatus,
      };
    }),
  };
}

function chromeSignature(chrome: CookieTriageChrome): string {
  return [
    chrome.selectedPurpose,
    chrome.isRefreshing ? '1' : '0',
    chrome.purposes.join(','),
    chrome.tabs
      .map((tab) => `${tab.id}:${tab.totalCount}:${tab.countBusy ? 1 : 0}:${tab.loadStatus}`)
      .join('|'),
  ].join('/');
}

/** Provides cookie triage session state and list fetching to the view tree. */
export function CookieTriageProvider({ triageType, app, children }: CookieTriageProviderProps) {
  const [state, dispatch] = useReducer(cookieTriageReducer, triageType, createEmptySession);
  const [appliedSuggestionsByPurpose, setAppliedSuggestionsByPurpose] =
    useState<AppliedSuggestionsByPurpose>({});
  const listTool = useTool(app, LIST_TOOL_NAME[triageType]);
  const updateTool = useTool(app, UPDATE_TOOL_NAME[triageType]);
  const deleteTool = useTool(app, DELETE_TOOL_NAME[triageType]);
  const purposesTool = useTool<ConsentPurposeListNode[]>(app, PURPOSES_TOOL_NAME);

  const stateRef = useRef(state);
  stateRef.current = state;
  const appliedSuggestionsRef = useRef(appliedSuggestionsByPurpose);
  appliedSuggestionsRef.current = appliedSuggestionsByPurpose;
  const callRef = useRef(listTool.call);
  callRef.current = listTool.call;
  const updateCallRef = useRef(updateTool.call);
  updateCallRef.current = updateTool.call;
  const deleteCallRef = useRef(deleteTool.call);
  deleteCallRef.current = deleteTool.call;
  const purposesCallRef = useRef(purposesTool.call);
  purposesCallRef.current = purposesTool.call;
  const inFlightRef = useRef(new Set<CookieTriagePurposeCategory>());
  const countInFlightRef = useRef(new Set<CookieTriagePurposeCategory>());
  const mutatingRowsRef = useRef(new Set<string>());
  const notesChainRef = useRef(new Map<string, Promise<void>>());
  const pendingNotesRef = useRef(new Map<string, string>());
  const appRef = useRef(app);
  appRef.current = app;

  const persistRef = useRef<ReturnType<typeof createCookieTriagePersist> | undefined>(undefined);
  if (persistRef.current === undefined) {
    persistRef.current = createCookieTriagePersist({
      stateRef,
      appliedSuggestionsRef,
      setAppliedSuggestionsByPurpose,
      updateCallRef,
      deleteCallRef,
      mutatingRowsRef,
      notesChainRef,
      pendingNotesRef,
      dispatch,
    });
  }
  const persist = persistRef.current;

  const fetchRef = useRef<ReturnType<typeof createCookieTriageFetch> | undefined>(undefined);
  if (fetchRef.current === undefined) {
    fetchRef.current = createCookieTriageFetch({
      stateRef,
      callRef,
      purposesCallRef,
      inFlightRef,
      countInFlightRef,
      dispatch,
    });
  }
  const fetchApi = fetchRef.current;

  useEffect(() => {
    if (!app) {
      return undefined;
    }

    let cancelled = false;

    void (async () => {
      const result = await purposesCallRef.current({ limit: 100 });
      if (cancelled || result.error !== undefined || !Array.isArray(result.data)) {
        return;
      }
      const purposeOptions = projectPurposeOptions(result.data);
      if (purposeOptions.length === 0) {
        return;
      }
      dispatch({ type: 'setPurposeOptions', purposeOptions });
    })();

    return () => {
      cancelled = true;
    };
  }, [app]);

  useEffect(() => {
    if (!app) {
      return undefined;
    }

    let cancelled = false;

    void (async () => {
      const selected = stateRef.current.selectedPurpose;
      if (selected !== CookieTriagePurposeCategory.Custom) {
        dispatchAndSync(stateRef, dispatch, {
          type: 'countFetchStart',
          purpose: CookieTriagePurposeCategory.Custom,
        });
      }
      await Promise.all(
        initialCountPurposes(selected).map((purpose) =>
          fetchApi.fetchCategoryCount(purpose, {
            markBusy: true,
            isCancelled: () => cancelled,
          }),
        ),
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [app, fetchApi, triageType]);

  useEffect(() => {
    if (!app) {
      return undefined;
    }

    let cancelled = false;

    void fetchApi.fetchSummaryTotals(() => cancelled);

    return () => {
      cancelled = true;
    };
  }, [app, fetchApi, triageType]);

  useEffect(() => {
    if (!app) {
      return;
    }
    void fetchApi.fetchPurposePages(state.selectedPurpose, 'initial');
  }, [app, fetchApi, state.selectedPurpose]);

  const customPurposeSlugsKey = selectCustomPurposeSlugs(state.purposeOptions).join(',');

  useEffect(() => {
    if (!app || !state.purposeOptionsLoaded) {
      return;
    }

    if (customPurposeSlugsKey.length === 0) {
      dispatch({
        type: 'setCategoryCount',
        purpose: CookieTriagePurposeCategory.Custom,
        totalCount: getCategory(stateRef.current.categories, CookieTriagePurposeCategory.Custom)
          .totalCount,
      });
      return;
    }

    if (stateRef.current.selectedPurpose === CookieTriagePurposeCategory.Custom) {
      void fetchApi.fetchPurposePages(CookieTriagePurposeCategory.Custom, 'initial');
    } else {
      void fetchApi.fetchCategoryCount(CookieTriagePurposeCategory.Custom, { markBusy: true });
    }
  }, [app, customPurposeSlugsKey, fetchApi, state.purposeOptionsLoaded]);

  const actions = useMemo<CookieTriageActions>(
    () => ({
      decide: (purpose, name, decision) => persist.persistDecision(purpose, name, decision),
      applySuggestions: persist.applySuggestions,
      undoSuggestions: persist.undoSuggestions,
      undo: (purpose, name) => persist.persistDecision(purpose, name, undefined),
      updateNotes: persist.persistNotes,
      updatePurpose: persist.persistPurposes,
      selectPurpose: (purpose) => dispatch({ type: 'selectPurpose', purpose }),
      loadMore: (purpose) => {
        void fetchApi.fetchPurposePages(purpose, 'more');
      },
      refresh: () => {
        void fetchApi.refresh();
      },
      askOpinion: async (purpose, name) => {
        const connected = appRef.current;
        if (!connected) {
          throw new Error('Not connected to the host');
        }
        const row = getCategory(stateRef.current.categories, purpose).cookies.find(
          (candidate) => candidate.name === name,
        );
        if (!row) {
          throw new Error(`Row not found: ${name}`);
        }

        const result = await connected.sendMessage({
          role: 'user',
          content: [
            {
              type: 'text',
              text: buildAskOpinionPrompt({
                triageType: stateRef.current.triageType,
                item: row.initial,
              }),
            },
          ],
        });
        if (result.isError) {
          throw new Error('Host rejected the recommendation request');
        }
      },
      remove: persist.persistRemove,
    }),
    [fetchApi, persist],
  );

  const meta = useMemo<CookieTriageMeta>(
    () => ({
      triageType: state.triageType,
      purposeOptions: state.purposeOptions,
    }),
    [state.purposeOptions, state.triageType],
  );

  const triagedCount = selectTriagedCount(state.categories);
  const summary = useMemo<CookieTriageSummary>(
    () => ({
      pendingCount: state.pendingTotal ?? 0,
      dormantCount: state.dormantTotal ?? 0,
      triagedCount,
      summaryBusy: state.summaryLoadStatus === CookieTriageLoadStatus.Loading,
    }),
    [state.dormantTotal, state.pendingTotal, state.summaryLoadStatus, triagedCount],
  );

  const nextChrome = projectChrome(state);
  const chromeKey = chromeSignature(nextChrome);
  const chromeRef = useRef(nextChrome);
  if (chromeSignature(chromeRef.current) !== chromeKey) {
    chromeRef.current = nextChrome;
  }
  const chrome = chromeRef.current;

  const activeCategory = getCategory(state.categories, state.selectedPurpose);

  return (
    <CookieTriageMetaContext.Provider value={meta}>
      <CookieTriageSummaryContext.Provider value={summary}>
        <CookieTriageChromeContext.Provider value={chrome}>
          <CookieTriageActiveCategoryContext.Provider value={activeCategory}>
            <AppliedSuggestionsContext.Provider value={appliedSuggestionsByPurpose}>
              <CookieTriageActionsContext.Provider value={actions}>
                {children}
              </CookieTriageActionsContext.Provider>
            </AppliedSuggestionsContext.Provider>
          </CookieTriageActiveCategoryContext.Provider>
        </CookieTriageChromeContext.Provider>
      </CookieTriageSummaryContext.Provider>
    </CookieTriageMetaContext.Provider>
  );
}
