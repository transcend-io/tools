import type { App } from '@modelcontextprotocol/ext-apps';
import { useTool } from '@transcend-io/mcp-server-base/ui';
import { createContext, useContext, useEffect, useReducer, useRef, type ReactNode } from 'react';

import {
  COOKIE_TRIAGE_AUTOFILL_PAGES,
  buildTriageDormantCountArgs,
  buildTriageListArgs,
  buildTriageNotesUpdateArgs,
  buildTriagePendingCountArgs,
  buildTriagePurposeCountArgs,
  buildTriagePurposesUpdateArgs,
  buildTriageUpdateArgs,
} from '../../lib/cookieTriageQuery.ts';
import type { ConsentTriageType } from '../../lib/cookieTriageTypes.ts';
import {
  projectPurposeOptions,
  type ConsentPurposeListNode,
} from '../../lib/projectPurposeOptions.ts';
import { projectListNodeForTriage } from '../../lib/projectTriageItem.ts';
import {
  COOKIE_TRIAGE_PURPOSE_ORDER,
  type CookieTriagePurposeCategory,
} from '../../lib/resolvePrimaryCookiePurpose.ts';
import {
  buildAskOpinionPrompt,
  cookieTriageReducer,
  createEmptySession,
  selectCustomPurposeSlugs,
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

const UPDATE_TOOL_NAME = {
  cookies: 'consent_update_cookies',
  data_flows: 'consent_update_data_flows',
} as const;

const PURPOSES_TOOL_NAME = 'consent_list_purposes';

const CookieTriageStateContext = createContext<CookieTriageSessionState | null>(null);

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
  const updateTool = useTool(app, UPDATE_TOOL_NAME[triageType]);
  const purposesTool = useTool<ConsentPurposeListNode[]>(app, PURPOSES_TOOL_NAME);

  const stateRef = useRef(state);
  stateRef.current = state;
  const callRef = useRef(listTool.call);
  callRef.current = listTool.call;
  const updateCallRef = useRef(updateTool.call);
  updateCallRef.current = updateTool.call;
  const purposesCallRef = useRef(purposesTool.call);
  purposesCallRef.current = purposesTool.call;
  const inFlightRef = useRef(new Set<CookieTriagePurposeCategory>());
  const mutatingRowsRef = useRef(new Set<string>());
  const notesChainRef = useRef(new Map<string, Promise<void>>());
  const pendingNotesRef = useRef(new Map<string, string>());

  function rowMutationKey(purpose: CookieTriagePurposeCategory, name: string): string {
    return `${purpose}:${name}`;
  }

  async function persistDecision(
    purpose: CookieTriagePurposeCategory,
    name: string,
    decision: CookieTriageDecision | undefined,
  ): Promise<void> {
    const key = rowMutationKey(purpose, name);
    if (mutatingRowsRef.current.has(key)) {
      throw new Error('A triage update is already in progress for this row');
    }

    const row = stateRef.current.categories[purpose].cookies.find(
      (candidate) => candidate.name === name,
    );
    if (!row) {
      throw new Error(`Row not found: ${name}`);
    }
    if (decision !== undefined && decision !== 'approve' && decision !== 'junk') {
      throw new Error(`Unsupported triage decision: ${decision}`);
    }
    if (decision === undefined && row.decision === undefined) {
      return;
    }
    if (decision !== undefined && row.decision === decision) {
      return;
    }

    mutatingRowsRef.current.add(key);
    try {
      const result = await updateCallRef.current(
        buildTriageUpdateArgs(stateRef.current.triageType, row.initial, decision),
      );
      if (result.error !== undefined) {
        throw new Error(result.error);
      }

      if (decision === undefined) {
        dispatch({ type: 'undo', purpose, name });
      } else {
        dispatch({ type: 'decide', purpose, name, decision });
      }
    } finally {
      mutatingRowsRef.current.delete(key);
    }
  }

  async function persistNotes(
    purpose: CookieTriagePurposeCategory,
    name: string,
    notes: string,
  ): Promise<void> {
    const key = rowMutationKey(purpose, name);
    pendingNotesRef.current.set(key, notes);

    const previous = notesChainRef.current.get(key) ?? Promise.resolve();
    const next = previous
      .catch(() => undefined)
      .then(async () => {
        const latest = pendingNotesRef.current.get(key);
        if (latest === undefined) {
          return;
        }

        const row = stateRef.current.categories[purpose].cookies.find(
          (candidate) => candidate.name === name,
        );
        if (!row) {
          pendingNotesRef.current.delete(key);
          throw new Error(`Row not found: ${name}`);
        }
        if (row.notes === latest) {
          pendingNotesRef.current.delete(key);
          return;
        }

        const result = await updateCallRef.current(
          buildTriageNotesUpdateArgs(stateRef.current.triageType, row.initial, latest),
        );
        if (result.error !== undefined) {
          throw new Error(result.error);
        }

        dispatch({ type: 'setNotes', purpose, name, notes: latest });
        if (pendingNotesRef.current.get(key) === latest) {
          pendingNotesRef.current.delete(key);
        }
      });

    notesChainRef.current.set(key, next);
    try {
      await next;
    } finally {
      if (notesChainRef.current.get(key) === next) {
        notesChainRef.current.delete(key);
      }
    }
  }

  async function persistPurposes(
    purpose: CookieTriagePurposeCategory,
    name: string,
    trackingPurposes: string[],
  ): Promise<void> {
    const key = rowMutationKey(purpose, name);
    if (mutatingRowsRef.current.has(key)) {
      throw new Error('A triage update is already in progress for this row');
    }

    const next = trackingPurposes.map((slug) => slug.trim()).filter((slug) => slug.length > 0);

    const row = stateRef.current.categories[purpose].cookies.find(
      (candidate) => candidate.name === name,
    );
    if (!row) {
      throw new Error(`Row not found: ${name}`);
    }

    const current = row.initial.trackingPurposes ?? [];
    if (
      current.length === next.length &&
      current.every((slug) => next.includes(slug)) &&
      next.every((slug) => current.includes(slug))
    ) {
      return;
    }

    mutatingRowsRef.current.add(key);
    try {
      const result = await updateCallRef.current(
        buildTriagePurposesUpdateArgs(stateRef.current.triageType, row.initial, next),
      );
      if (result.error !== undefined) {
        throw new Error(result.error);
      }

      dispatch({ type: 'setTrackingPurposes', purpose, name, trackingPurposes: next });
    } finally {
      mutatingRowsRef.current.delete(key);
    }
  }

  async function fetchSummaryTotals(isCancelled?: () => boolean): Promise<void> {
    const [pendingResult, dormantResult] = await Promise.all([
      callRef.current(buildTriagePendingCountArgs()),
      callRef.current(buildTriageDormantCountArgs()),
    ]);
    if (isCancelled?.()) {
      return;
    }

    const pendingTotal = pendingResult.error === undefined ? pendingResult.totalCount : undefined;
    const dormantTotal = dormantResult.error === undefined ? dormantResult.totalCount : undefined;
    if (pendingTotal === undefined && dormantTotal === undefined) {
      return;
    }

    dispatch({
      type: 'setSummaryTotals',
      ...(pendingTotal !== undefined ? { pendingTotal } : {}),
      ...(dormantTotal !== undefined ? { dormantTotal } : {}),
    });
  }

  /**
   * Lightweight `totalCount` fetch for a purpose tab badge.
   * When `afterRefresh` is set, clears pending rows first and leaves the tab
   * idle so selecting it triggers a full list load.
   */
  async function fetchCategoryCount(
    purpose: CookieTriagePurposeCategory,
    options?: {
      afterRefresh?: boolean;
      isCancelled?: () => boolean;
    },
  ): Promise<void> {
    let session = stateRef.current;
    if (purpose === 'Custom' && selectCustomPurposeSlugs(session.purposeOptions).length === 0) {
      return;
    }

    if (options?.afterRefresh) {
      if (inFlightRef.current.has(purpose)) {
        return;
      }
      if (session.categories[purpose].loadStatus === 'loading') {
        return;
      }
      inFlightRef.current.add(purpose);
      const startAction: CookieTriageAction = { type: 'refreshStart', purpose };
      session = cookieTriageReducer(session, startAction);
      dispatch(startAction);
      stateRef.current = session;
    }

    try {
      const result = await callRef.current(
        buildTriagePurposeCountArgs(
          triageType,
          purpose,
          selectCustomPurposeSlugs(stateRef.current.purposeOptions),
        ),
      );
      if (options?.isCancelled?.()) {
        return;
      }
      if (result.error !== undefined) {
        if (options?.afterRefresh) {
          const loadError: CookieTriageAction = {
            type: 'loadError',
            purpose,
            error: result.error,
          };
          dispatch(loadError);
          stateRef.current = cookieTriageReducer(stateRef.current, loadError);
        }
        return;
      }
      if (result.totalCount === undefined) {
        if (options?.afterRefresh) {
          const defer: CookieTriageAction = {
            type: 'setCategoryCount',
            purpose,
            totalCount: stateRef.current.categories[purpose].totalCount,
            deferListLoad: true,
          };
          dispatch(defer);
          stateRef.current = cookieTriageReducer(stateRef.current, defer);
        }
        return;
      }

      const countAction: CookieTriageAction = {
        type: 'setCategoryCount',
        purpose,
        totalCount: result.totalCount,
        ...(options?.afterRefresh ? { deferListLoad: true } : {}),
      };
      dispatch(countAction);
      stateRef.current = cookieTriageReducer(stateRef.current, countAction);
    } finally {
      if (options?.afterRefresh) {
        inFlightRef.current.delete(purpose);
      }
    }
  }

  async function fetchPurposePages(
    purpose: CookieTriagePurposeCategory,
    mode: 'initial' | 'more' | 'refresh',
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
    if ((mode === 'more' || mode === 'refresh') && category.loadStatus === 'loading') {
      return;
    }
    if (mode === 'more' && !category.hasNextPage && category.loadStatus !== 'error') {
      return;
    }

    if (purpose === 'Custom' && selectCustomPurposeSlugs(session.purposeOptions).length === 0) {
      return;
    }

    inFlightRef.current.add(purpose);
    const startAction: CookieTriageAction =
      mode === 'refresh' ? { type: 'refreshStart', purpose } : { type: 'loadStart', purpose };
    session = cookieTriageReducer(session, startAction);
    dispatch(startAction);
    stateRef.current = session;

    const pendingBefore = session.categories[purpose].cookies.filter(
      (row) => row.decision === undefined,
    ).length;
    const maxPages = 1 + COOKIE_TRIAGE_AUTOFILL_PAGES;

    try {
      for (let pages = 0; pages < maxPages; pages += 1) {
        const offset = session.categories[purpose].nextOffset;
        const result = await callRef.current(
          buildTriageListArgs(
            triageType,
            purpose,
            offset,
            selectCustomPurposeSlugs(session.purposeOptions),
          ),
        );
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

        const pendingAfter = session.categories[purpose].cookies.filter(
          (row) => row.decision === undefined,
        ).length;
        if (pendingAfter > pendingBefore || !session.categories[purpose].hasNextPage) {
          return;
        }
      }
    } finally {
      inFlightRef.current.delete(purpose);
    }
  }

  const fetchRef = useRef(fetchPurposePages);
  fetchRef.current = fetchPurposePages;
  const fetchCountRef = useRef(fetchCategoryCount);
  fetchCountRef.current = fetchCategoryCount;

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
      await Promise.all(
        COOKIE_TRIAGE_PURPOSE_ORDER.map((purpose) => {
          if (
            purpose === 'Custom' &&
            selectCustomPurposeSlugs(stateRef.current.purposeOptions).length === 0
          ) {
            return Promise.resolve();
          }
          return fetchCountRef.current(purpose, { isCancelled: () => cancelled });
        }),
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [app, triageType]);

  useEffect(() => {
    if (!app) {
      return undefined;
    }

    let cancelled = false;

    void fetchSummaryTotals(() => cancelled);

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

  const customPurposeSlugsKey = selectCustomPurposeSlugs(state.purposeOptions).join(',');

  useEffect(() => {
    if (!app || customPurposeSlugsKey.length === 0) {
      return;
    }
    if (stateRef.current.selectedPurpose === 'Custom') {
      void fetchRef.current('Custom', 'initial');
    } else {
      void fetchCountRef.current('Custom');
    }
  }, [app, customPurposeSlugsKey]);

  const actions: CookieTriageActions = {
    decide: (purpose, name, decision) => persistDecision(purpose, name, decision),
    undo: (purpose, name) => persistDecision(purpose, name, undefined),
    updateNotes: (purpose, name, notes) => persistNotes(purpose, name, notes),
    updatePurpose: (purpose, name, trackingPurposes) =>
      persistPurposes(purpose, name, trackingPurposes),
    selectPurpose: (purpose) => dispatch({ type: 'selectPurpose', purpose }),
    loadMore: (purpose) => {
      void fetchRef.current(purpose, 'more');
    },
    refresh: () => {
      void (async () => {
        void fetchSummaryTotals();
        const selected = stateRef.current.selectedPurpose;
        const purposes = selectPurposes(stateRef.current);
        await Promise.all(
          purposes.map((purpose) =>
            purpose === selected
              ? fetchRef.current(purpose, 'refresh')
              : fetchCountRef.current(purpose, { afterRefresh: true }),
          ),
        );
      })();
    },
    askOpinion: async (purpose, name) => {
      if (!app) {
        throw new Error('Not connected to the host');
      }
      const row = stateRef.current.categories[purpose].cookies.find(
        (candidate) => candidate.name === name,
      );
      if (!row) {
        throw new Error(`Row not found: ${name}`);
      }

      const result = await app.sendMessage({
        role: 'user',
        content: [
          {
            type: 'text',
            text: buildAskOpinionPrompt({
              triageType: stateRef.current.triageType,
              purpose,
              item: row.initial,
            }),
          },
        ],
      });
      if (result.isError) {
        throw new Error('Host rejected the recommendation request');
      }
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
  return selectSummary(useCookieTriageState());
}

/** Purpose-keyed category map. */
export function useCookieTriageCategories(): CookieTriageCategoriesState {
  return useCookieTriageState().categories;
}

/** Ordered purposes shown as tabs. */
export function useCookieTriagePurposes(): CookieTriagePurposeCategory[] {
  return selectPurposes(useCookieTriageState());
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
