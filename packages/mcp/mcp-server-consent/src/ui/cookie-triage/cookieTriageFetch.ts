import type { MutableRefObject } from 'react';

import {
  COOKIE_TRIAGE_AUTOFILL_PAGES,
  buildTriageDormantCountArgs,
  buildTriageListArgs,
  buildTriagePendingCountArgs,
  buildTriagePurposeCountArgs,
} from '../../lib/cookieTriageQuery.ts';
import { projectListNodeForTriage } from '../../lib/projectTriageItem.ts';
import {
  COOKIE_TRIAGE_PURPOSE_ORDER,
  type CookieTriagePurposeCategory,
} from '../../lib/resolvePrimaryCookiePurpose.ts';
import { dispatchAndSync, type CookieTriageToolCall } from './cookieTriagePersist.ts';
import {
  selectCustomPurposeSlugs,
  selectPurposes,
  type CookieTriageAction,
  type CookieTriageSessionState,
} from './cookieTriageState.ts';

/** Mutable refs the fetch factory closes over. */
export interface CookieTriageFetchDeps {
  /** Live session snapshot */
  stateRef: MutableRefObject<CookieTriageSessionState>;
  /** List-tool call (cookies or data flows) */
  callRef: MutableRefObject<CookieTriageToolCall>;
  /** Purposes-catalog tool call */
  purposesCallRef: MutableRefObject<CookieTriageToolCall>;
  /** In-flight list loads keyed by purpose */
  inFlightRef: MutableRefObject<Set<CookieTriagePurposeCategory>>;
  /** In-flight count-only fetches keyed by purpose */
  countInFlightRef: MutableRefObject<Set<CookieTriagePurposeCategory>>;
  /** Session reducer dispatch */
  dispatch: (action: CookieTriageAction) => void;
}

/** List / count / summary fetches bound to one triage session. */
export interface CookieTriageFetch {
  /** Fetch overview pending + dormant totals */
  fetchSummaryTotals: (isCancelled?: () => boolean) => Promise<void>;
  /** Fetch a purpose-tab badge total */
  fetchCategoryCount: (
    purpose: CookieTriagePurposeCategory,
    options?: {
      /** After refresh: drop pending rows and defer the next list load */
      afterRefresh?: boolean;
      /** Badge-only shimmer via `countBusy` */
      markBusy?: boolean;
      /** Abort applying results when the owning effect unmounted */
      isCancelled?: () => boolean;
    },
  ) => Promise<void>;
  /** Fetch list pages for a purpose tab */
  fetchPurposePages: (
    purpose: CookieTriagePurposeCategory,
    mode: 'initial' | 'more' | 'refresh',
  ) => Promise<void>;
  /** Replay the active tab list and count-only refresh the rest */
  refresh: () => Promise<void>;
}

/** Bind list/count fetches to session refs. Safe to call once per provider mount. */
export function createCookieTriageFetch(deps: CookieTriageFetchDeps): CookieTriageFetch {
  function dispatchLocal(action: CookieTriageAction): CookieTriageSessionState {
    return dispatchAndSync(deps.stateRef, deps.dispatch, action);
  }

  async function fetchSummaryTotals(isCancelled?: () => boolean): Promise<void> {
    dispatchLocal({ type: 'summaryLoadStart' });
    const [pendingResult, dormantResult] = await Promise.all([
      deps.callRef.current(buildTriagePendingCountArgs()),
      deps.callRef.current(buildTriageDormantCountArgs()),
    ]);
    if (isCancelled?.()) {
      return;
    }

    const pendingTotal = pendingResult.error === undefined ? pendingResult.totalCount : undefined;
    const dormantTotal = dormantResult.error === undefined ? dormantResult.totalCount : undefined;

    dispatchLocal({
      type: 'setSummaryTotals',
      ...(pendingTotal !== undefined ? { pendingTotal } : {}),
      ...(dormantTotal !== undefined ? { dormantTotal } : {}),
    });
  }

  async function fetchCategoryCount(
    purpose: CookieTriagePurposeCategory,
    options?: {
      afterRefresh?: boolean;
      markBusy?: boolean;
      isCancelled?: () => boolean;
    },
  ): Promise<void> {
    let session = deps.stateRef.current;
    const triageType = session.triageType;
    if (purpose === 'Custom' && selectCustomPurposeSlugs(session.purposeOptions).length === 0) {
      return;
    }

    if (options?.afterRefresh) {
      if (deps.inFlightRef.current.has(purpose)) {
        return;
      }
      if (session.categories[purpose].loadStatus === 'loading') {
        return;
      }
      deps.inFlightRef.current.add(purpose);
      session = dispatchLocal({ type: 'refreshStart', purpose });
    } else if (options?.markBusy) {
      if (deps.countInFlightRef.current.has(purpose)) {
        return;
      }
      deps.countInFlightRef.current.add(purpose);
      if (!session.categories[purpose].countBusy) {
        session = dispatchLocal({ type: 'countFetchStart', purpose });
      }
    }

    try {
      const result = await deps.callRef.current(
        buildTriagePurposeCountArgs(
          triageType,
          purpose,
          selectCustomPurposeSlugs(deps.stateRef.current.purposeOptions),
        ),
      );
      if (options?.isCancelled?.()) {
        if (options.markBusy) {
          dispatchLocal({
            type: 'setCategoryCount',
            purpose,
            totalCount: deps.stateRef.current.categories[purpose].totalCount,
          });
        }
        return;
      }
      if (result.error !== undefined) {
        if (options?.afterRefresh) {
          dispatchLocal({
            type: 'loadError',
            purpose,
            error: result.error,
          });
        } else if (options?.markBusy) {
          dispatchLocal({
            type: 'setCategoryCount',
            purpose,
            totalCount: deps.stateRef.current.categories[purpose].totalCount,
          });
        }
        return;
      }
      if (result.totalCount === undefined) {
        if (options?.afterRefresh || options?.markBusy) {
          dispatchLocal({
            type: 'setCategoryCount',
            purpose,
            totalCount: deps.stateRef.current.categories[purpose].totalCount,
            ...(options.afterRefresh ? { deferListLoad: true } : {}),
          });
        }
        return;
      }

      dispatchLocal({
        type: 'setCategoryCount',
        purpose,
        totalCount: result.totalCount,
        ...(options?.afterRefresh ? { deferListLoad: true } : {}),
      });
    } finally {
      if (options?.afterRefresh) {
        deps.inFlightRef.current.delete(purpose);
      }
      if (options?.markBusy) {
        deps.countInFlightRef.current.delete(purpose);
      }
    }
  }

  async function fetchPurposePages(
    purpose: CookieTriagePurposeCategory,
    mode: 'initial' | 'more' | 'refresh',
  ): Promise<void> {
    if (deps.inFlightRef.current.has(purpose)) {
      return;
    }

    let session = deps.stateRef.current;
    const triageType = session.triageType;
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

    deps.inFlightRef.current.add(purpose);
    session = dispatchLocal(
      mode === 'refresh' ? { type: 'refreshStart', purpose } : { type: 'loadStart', purpose },
    );

    const pendingBefore = session.categories[purpose].cookies.filter(
      (row) => row.decision === undefined,
    ).length;
    const maxPages = 1 + COOKIE_TRIAGE_AUTOFILL_PAGES;

    try {
      for (let pages = 0; pages < maxPages; pages += 1) {
        const offset = session.categories[purpose].nextOffset;
        const result = await deps.callRef.current(
          buildTriageListArgs(
            triageType,
            purpose,
            offset,
            selectCustomPurposeSlugs(session.purposeOptions),
          ),
        );
        if (result.error !== undefined) {
          dispatchLocal({
            type: 'loadError',
            purpose,
            error: result.error,
          });
          return;
        }

        const nodes = Array.isArray(result.data) ? result.data : [];
        const items = nodes
          .map((node) => projectListNodeForTriage(triageType, node))
          .filter((item): item is NonNullable<typeof item> => item !== undefined);

        session = dispatchLocal({
          type: 'appendPage',
          purpose,
          items,
          fetchedCount: nodes.length,
          ...(result.totalCount !== undefined ? { totalCount: result.totalCount } : {}),
          hasNextPage: result.hasNextPage ?? false,
        });

        const pendingAfter = session.categories[purpose].cookies.filter(
          (row) => row.decision === undefined,
        ).length;
        if (pendingAfter > pendingBefore || !session.categories[purpose].hasNextPage) {
          return;
        }
      }
    } finally {
      deps.inFlightRef.current.delete(purpose);
    }
  }

  async function refresh(): Promise<void> {
    void fetchSummaryTotals();
    const selected = deps.stateRef.current.selectedPurpose;
    const purposes = selectPurposes(deps.stateRef.current);
    await Promise.all(
      purposes.map((purpose) =>
        purpose === selected
          ? fetchPurposePages(purpose, 'refresh')
          : fetchCategoryCount(purpose, { afterRefresh: true }),
      ),
    );
  }

  return {
    fetchSummaryTotals,
    fetchCategoryCount,
    fetchPurposePages,
    refresh,
  };
}

/** Purpose tabs whose badge totals load on first paint (not the selected list tab). */
export function initialCountPurposes(
  selected: CookieTriagePurposeCategory,
): CookieTriagePurposeCategory[] {
  return COOKIE_TRIAGE_PURPOSE_ORDER.filter(
    (purpose) => purpose !== 'Custom' && purpose !== selected,
  );
}
