import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react';

import type { CookieTriageAppPayload } from '../../lib/cookieTriageTypes.ts';
import type { CookieTriagePurposeCategory } from '../../lib/resolvePrimaryCookiePurpose.ts';
import {
  canUndoRow,
  cookieTriageReducer,
  createInitialState,
  selectPurposes,
  selectSummary,
  type CookieTriageAction,
  type CookieTriageCategoriesState,
  type CookieTriageCategoryState,
  type CookieTriageDecision,
  type CookieTriageSessionState,
  type CookieTriageSummary,
} from './cookieTriageState.ts';

const CookieTriageStateContext = createContext<CookieTriageSessionState | null>(null);
const CookieTriageDispatchContext = createContext<Dispatch<CookieTriageAction> | null>(null);

interface CookieTriageProviderProps {
  /** Payload from `consent_cookie_triage_review_app`; cloned into session state on mount */
  payload: CookieTriageAppPayload;
  /** Loaded view subtree */
  children: ReactNode;
}

/** Provides cookie triage session state with a split dispatch context to limit rerenders. */
export function CookieTriageProvider({ payload, children }: CookieTriageProviderProps) {
  const [state, dispatch] = useReducer(cookieTriageReducer, payload, createInitialState);

  return (
    <CookieTriageStateContext.Provider value={state}>
      <CookieTriageDispatchContext.Provider value={dispatch}>
        {children}
      </CookieTriageDispatchContext.Provider>
    </CookieTriageStateContext.Provider>
  );
}

/** Read the full cookie triage session state. */
export function useCookieTriageState(): CookieTriageSessionState {
  const state = useContext(CookieTriageStateContext);
  if (!state) {
    throw new Error('useCookieTriageState must be used within CookieTriageProvider');
  }
  return state;
}

/** Dispatch triage actions without subscribing to state updates. */
export function useCookieTriageDispatch(): Dispatch<CookieTriageAction> {
  const dispatch = useContext(CookieTriageDispatchContext);
  if (!dispatch) {
    throw new Error('useCookieTriageDispatch must be used within CookieTriageProvider');
  }
  return dispatch;
}

/** Stable action creators backed by the dispatch context. */
export function useCookieTriageActions(): {
  /** Record a triage decision for one cookie */
  decide: (
    purpose: CookieTriagePurposeCategory,
    name: string,
    decision: CookieTriageDecision,
  ) => void;
  /** Revert one cookie row to its initial pending state */
  undo: (purpose: CookieTriagePurposeCategory, name: string) => void;
  /** Select the active purpose tab */
  selectPurpose: (purpose: CookieTriagePurposeCategory) => void;
  /** Apply pending approve/junk suggestions for one purpose category */
  applySuggestions: (purpose: CookieTriagePurposeCategory) => void;
} {
  const dispatch = useCookieTriageDispatch();

  return useMemo(
    () => ({
      decide: (purpose, name, decision) => dispatch({ type: 'decide', purpose, name, decision }),
      undo: (purpose, name) => dispatch({ type: 'undo', purpose, name }),
      selectPurpose: (purpose) => dispatch({ type: 'selectPurpose', purpose }),
      applySuggestions: (purpose) => dispatch({ type: 'applySuggestions', purpose }),
    }),
    [dispatch],
  );
}

/** Derived overview counts; recomputes only when category references change. */
export function useCookieTriageSummary(): CookieTriageSummary {
  const { categories } = useCookieTriageState();
  return useMemo(() => selectSummary(categories), [categories]);
}

/** Purpose-keyed category state for section rendering. */
export function useCookieTriageCategories(): CookieTriageCategoriesState {
  return useCookieTriageState().categories;
}

/** Purpose keys present in the session, in canonical tab order. */
export function useCookieTriagePurposes(): CookieTriagePurposeCategory[] {
  const { categories } = useCookieTriageState();
  return useMemo(() => selectPurposes(categories), [categories]);
}

/** Currently selected purpose tab, if any categories are loaded. */
export function useSelectedPurpose(): CookieTriagePurposeCategory | undefined {
  return useCookieTriageState().selectedPurpose;
}

/** Live state for one purpose category bucket. */
export function useCookieTriageCategory(
  purpose: CookieTriagePurposeCategory,
): CookieTriageCategoryState | undefined {
  return useCookieTriageState().categories[purpose];
}

/** Live state for the currently selected purpose category. */
export function useSelectedCategory(): CookieTriageCategoryState | undefined {
  const { categories, selectedPurpose } = useCookieTriageState();
  return selectedPurpose !== undefined ? categories[selectedPurpose] : undefined;
}

/** Whether one row can be reverted to its initial pending state. */
export function useCanUndoRow(purpose: CookieTriagePurposeCategory, name: string): boolean {
  const row = useCookieTriageCategory(purpose)?.cookies.find(
    (candidate) => candidate.name === name,
  );
  return row ? canUndoRow(row) : false;
}
