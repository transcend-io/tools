import type { ParsedToolResult } from '@transcend-io/mcp-server-base/ui';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import {
  buildTriageBulkUpdateArgs,
  buildTriageNotesUpdateArgs,
  buildTriagePurposesUpdateArgs,
  buildTriageUpdateArgs,
} from '../../lib/cookieTriageQuery.ts';
import type { CookieTriagePurposeCategory } from '../../lib/resolvePrimaryCookiePurpose.ts';
import { triageCopy } from './cookieTriageCopy.ts';
import {
  CookieTriageDecision,
  cookieTriageReducer,
  getCategory,
  suggestRowDecision,
  type CookieTriageAction,
  type CookieTriageSessionState,
} from './cookieTriageState.ts';

/** Names successfully applied by the last Apply suggestions for a purpose tab. */
export type AppliedSuggestionsByPurpose = Partial<
  Record<CookieTriagePurposeCategory, readonly string[]>
>;

/** Tool `call` used by persist helpers. */
export type CookieTriageToolCall = (
  args?: Record<string, unknown>,
) => Promise<ParsedToolResult<unknown>>;

/** Mutable refs and React setters the persist factory closes over. */
export interface CookieTriagePersistDeps {
  /** Live session snapshot */
  stateRef: MutableRefObject<CookieTriageSessionState>;
  /** Last successful Apply suggestions names per purpose */
  appliedSuggestionsRef: MutableRefObject<AppliedSuggestionsByPurpose>;
  /** React setter for {@link CookieTriagePersistDeps.appliedSuggestionsRef} */
  setAppliedSuggestionsByPurpose: Dispatch<SetStateAction<AppliedSuggestionsByPurpose>>;
  /** Update-tool call (cookies or data flows) */
  updateCallRef: MutableRefObject<CookieTriageToolCall>;
  /** Delete-tool call (cookies or data flows) */
  deleteCallRef: MutableRefObject<CookieTriageToolCall>;
  /** In-flight row mutation keys (`id:…` or `name:…`) */
  mutatingRowsRef: MutableRefObject<Set<string>>;
  /** Serialized notes persist chain per entity */
  notesChainRef: MutableRefObject<Map<string, Promise<void>>>;
  /** Latest notes draft queued behind the persist chain */
  pendingNotesRef: MutableRefObject<Map<string, string>>;
  /** Session reducer dispatch */
  dispatch: Dispatch<CookieTriageAction>;
}

/** Persist helpers bound to one triage session. */
export interface CookieTriagePersist {
  /**
   * Persist an approve/junk decision, or restore NEEDS_REVIEW when `decision`
   * is undefined.
   */
  persistDecision: (
    purpose: CookieTriagePurposeCategory,
    name: string,
    decision: CookieTriageDecision | undefined,
  ) => Promise<void>;
  /** Apply static suggestions for all undecided loaded rows in a purpose tab. */
  applySuggestions: (purpose: CookieTriagePurposeCategory) => Promise<void>;
  /** Undo the last successful {@link CookieTriagePersist.applySuggestions} batch. */
  undoSuggestions: (purpose: CookieTriagePurposeCategory) => Promise<void>;
  /** Persist Notes (`description`) for one row. */
  persistNotes: (
    purpose: CookieTriagePurposeCategory,
    name: string,
    notes: string,
  ) => Promise<void>;
  /** Permanently delete one row via the delete tool. */
  persistRemove: (purpose: CookieTriagePurposeCategory, name: string) => Promise<void>;
  /** Persist tracking purposes for one row. */
  persistPurposes: (
    purpose: CookieTriagePurposeCategory,
    name: string,
    trackingPurposes: string[],
  ) => Promise<void>;
}

/** Entity lock key so mixed-purpose tab instances share one mutation guard. */
export function rowMutationKey(item: {
  /** Cookie name or data-flow value */
  name: string;
  /** Transcend id when available */
  id?: string;
}): string {
  return item.id ? `id:${item.id}` : `name:${item.name}`;
}

/**
 * Run `work` while exclusive locks are held for `keys`.
 *
 * Rejects if any key is already locked.
 */
export async function withRowLocks<T>(
  mutatingRows: Set<string>,
  keys: readonly string[],
  work: () => Promise<T>,
): Promise<T> {
  for (const key of keys) {
    if (mutatingRows.has(key)) {
      throw new Error(
        keys.length === 1
          ? 'A triage update is already in progress for this row'
          : 'A triage update is already in progress for one or more rows',
      );
    }
  }
  for (const key of keys) {
    mutatingRows.add(key);
  }
  try {
    return await work();
  } finally {
    for (const key of keys) {
      mutatingRows.delete(key);
    }
  }
}

/**
 * Apply an action to `stateRef` and React in the same step so async fetch
 * loops never read a stale snapshot.
 */
export function dispatchAndSync(
  stateRef: MutableRefObject<CookieTriageSessionState>,
  dispatch: Dispatch<CookieTriageAction>,
  action: CookieTriageAction,
): CookieTriageSessionState {
  const next = cookieTriageReducer(stateRef.current, action);
  stateRef.current = next;
  dispatch(action);
  return next;
}

function assertToolOk(result: ParsedToolResult<unknown>): void {
  if (result.error !== undefined) {
    throw new Error(result.error);
  }
}

/** Bind persist helpers to session refs. Safe to call once per provider mount. */
export function createCookieTriagePersist(deps: CookieTriagePersistDeps): CookieTriagePersist {
  function dispatchLocal(action: CookieTriageAction): void {
    dispatchAndSync(deps.stateRef, deps.dispatch, action);
  }

  async function persistDecision(
    purpose: CookieTriagePurposeCategory,
    name: string,
    decision: CookieTriageDecision | undefined,
  ): Promise<void> {
    const row = getCategory(deps.stateRef.current.categories, purpose).cookies.find(
      (candidate) => candidate.name === name,
    );
    if (!row) {
      throw new Error(`Row not found: ${name}`);
    }
    if (
      decision !== undefined &&
      decision !== CookieTriageDecision.Approve &&
      decision !== CookieTriageDecision.Junk
    ) {
      throw new Error(`Unsupported triage decision: ${decision}`);
    }
    if (decision === undefined && row.decision === undefined) {
      return;
    }
    if (decision !== undefined && row.decision === decision) {
      return;
    }

    const key = rowMutationKey(row.initial);
    await withRowLocks(deps.mutatingRowsRef.current, [key], async () => {
      const result = await deps.updateCallRef.current(
        buildTriageUpdateArgs(deps.stateRef.current.triageType, row.initial, decision),
      );
      assertToolOk(result);

      if (decision === undefined) {
        dispatchLocal({ type: 'undo', purpose, name });
      } else {
        dispatchLocal({ type: 'decide', purpose, name, decision });
      }
    });
  }

  async function applySuggestions(purpose: CookieTriagePurposeCategory): Promise<void> {
    const targets = getCategory(deps.stateRef.current.categories, purpose).cookies.flatMap(
      (row) => {
        const suggestion = suggestRowDecision(row);
        if (suggestion === undefined) {
          return [];
        }
        return [{ row, decision: suggestion }];
      },
    );

    if (targets.length === 0) {
      return;
    }

    const keys = targets.map((target) => rowMutationKey(target.row.initial));
    await withRowLocks(deps.mutatingRowsRef.current, keys, async () => {
      const result = await deps.updateCallRef.current(
        buildTriageBulkUpdateArgs(
          deps.stateRef.current.triageType,
          targets.map(({ row, decision }) => ({ item: row.initial, decision })),
        ),
      );
      assertToolOk(result);

      for (const { row, decision } of targets) {
        dispatchLocal({ type: 'decide', purpose, name: row.name, decision });
      }
      deps.setAppliedSuggestionsByPurpose((previous) => ({
        ...previous,
        [purpose]: targets.map(({ row }) => row.name),
      }));
    });
  }

  async function undoSuggestions(purpose: CookieTriagePurposeCategory): Promise<void> {
    const names = deps.appliedSuggestionsRef.current[purpose] ?? [];
    if (names.length === 0) {
      return;
    }

    const targets = names.flatMap((name) => {
      const row = getCategory(deps.stateRef.current.categories, purpose).cookies.find(
        (candidate) => candidate.name === name,
      );
      if (!row || row.decision === undefined) {
        return [];
      }
      return [row];
    });

    if (targets.length === 0) {
      deps.setAppliedSuggestionsByPurpose((previous) => ({
        ...previous,
        [purpose]: [],
      }));
      return;
    }

    const keys = targets.map((row) => rowMutationKey(row.initial));
    await withRowLocks(deps.mutatingRowsRef.current, keys, async () => {
      const result = await deps.updateCallRef.current(
        buildTriageBulkUpdateArgs(
          deps.stateRef.current.triageType,
          targets.map((row) => ({ item: row.initial, decision: undefined })),
        ),
      );
      assertToolOk(result);

      for (const row of targets) {
        dispatchLocal({ type: 'undo', purpose, name: row.name });
      }
      deps.setAppliedSuggestionsByPurpose((previous) => ({
        ...previous,
        [purpose]: [],
      }));
    });
  }

  async function persistNotes(
    purpose: CookieTriagePurposeCategory,
    name: string,
    notes: string,
  ): Promise<void> {
    const origin = getCategory(deps.stateRef.current.categories, purpose).cookies.find(
      (candidate) => candidate.name === name,
    );
    if (!origin) {
      throw new Error(`Row not found: ${name}`);
    }

    const key = rowMutationKey(origin.initial);
    deps.pendingNotesRef.current.set(key, notes);

    const previous = deps.notesChainRef.current.get(key) ?? Promise.resolve();
    const next = previous
      .catch(() => undefined)
      .then(async () => {
        const latest = deps.pendingNotesRef.current.get(key);
        if (latest === undefined) {
          return;
        }

        const row = getCategory(deps.stateRef.current.categories, purpose).cookies.find(
          (candidate) => candidate.name === name,
        );
        if (!row) {
          deps.pendingNotesRef.current.delete(key);
          throw new Error(`Row not found: ${name}`);
        }
        if (row.notes === latest) {
          deps.pendingNotesRef.current.delete(key);
          return;
        }

        const result = await deps.updateCallRef.current(
          buildTriageNotesUpdateArgs(deps.stateRef.current.triageType, row.initial, latest),
        );
        assertToolOk(result);

        dispatchLocal({ type: 'setNotes', purpose, name, notes: latest });
        if (deps.pendingNotesRef.current.get(key) === latest) {
          deps.pendingNotesRef.current.delete(key);
        }
      });

    deps.notesChainRef.current.set(key, next);
    try {
      await next;
    } finally {
      if (deps.notesChainRef.current.get(key) === next) {
        deps.notesChainRef.current.delete(key);
      }
    }
  }

  async function persistRemove(purpose: CookieTriagePurposeCategory, name: string): Promise<void> {
    const origin = getCategory(deps.stateRef.current.categories, purpose).cookies.find(
      (candidate) => candidate.name === name,
    );
    if (!origin) {
      throw new Error(`Row not found: ${name}`);
    }

    const key = rowMutationKey(origin.initial);
    await withRowLocks(deps.mutatingRowsRef.current, [key], async () => {
      const triageType = deps.stateRef.current.triageType;
      const { singular } = triageCopy(triageType);
      const row = getCategory(deps.stateRef.current.categories, purpose).cookies.find(
        (candidate) => candidate.name === name,
      );
      if (!row) {
        throw new Error(`Row not found: ${name}`);
      }
      if (!row.initial.id) {
        throw new Error(`${singular} "${name}" is missing an id and cannot be deleted`);
      }

      const result = await deps.deleteCallRef.current({ ids: [row.initial.id] });
      assertToolOk(result);

      dispatchLocal({ type: 'remove', purpose, name });
    });
  }

  async function persistPurposes(
    purpose: CookieTriagePurposeCategory,
    name: string,
    trackingPurposes: string[],
  ): Promise<void> {
    const next = trackingPurposes.map((slug) => slug.trim()).filter((slug) => slug.length > 0);

    const row = getCategory(deps.stateRef.current.categories, purpose).cookies.find(
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

    const key = rowMutationKey(row.initial);
    await withRowLocks(deps.mutatingRowsRef.current, [key], async () => {
      const result = await deps.updateCallRef.current(
        buildTriagePurposesUpdateArgs(deps.stateRef.current.triageType, row.initial, next),
      );
      assertToolOk(result);

      dispatchLocal({ type: 'setTrackingPurposes', purpose, name, trackingPurposes: next });
    });
  }

  return {
    persistDecision,
    applySuggestions,
    undoSuggestions,
    persistNotes,
    persistRemove,
    persistPurposes,
  };
}
