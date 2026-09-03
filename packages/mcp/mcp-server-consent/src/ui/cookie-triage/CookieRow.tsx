import { memo, useEffect, useRef, useState } from 'react';

import type { CookieTriagePurposeCategory } from '../../lib/resolvePrimaryCookiePurpose.ts';
import { useCookieTriageActions, useCookieTriageState } from './CookieTriageContext.tsx';
import {
  decisionReadLabel,
  formatEncounters,
  formatLastActivity,
  isDormantCookie,
  selectRowPurposeSlugs,
  type CookieRowState,
  type CookieTriageDecision,
} from './cookieTriageState.ts';
import { CheckIcon, CloseIcon, CommentIcon, TrashIcon } from './icons.tsx';
import { PurposeMultiSelect } from './PurposeMultiSelect.tsx';

interface CookieRowProps {
  /** Purpose tab this row belongs to */
  purpose: CookieTriagePurposeCategory;
  /** Live row state */
  row: CookieRowState;
}

const DECISION_BUTTON =
  'inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-sm border bg-surface text-content-muted disabled:cursor-not-allowed disabled:opacity-60';
const DECISION_IDLE = `${DECISION_BUTTON} border-line`;
const DECISION_ACTIVE = `${DECISION_BUTTON} border-brand-text text-brand-text`;
const ACTION_TEXT =
  'inline-flex h-9 shrink-0 cursor-pointer items-center rounded-sm border border-line bg-surface px-2.5 text-sm font-medium text-content-muted hover:text-content disabled:cursor-not-allowed disabled:opacity-60';

/** Quiet period before persisting notes after the last keystroke */
const NOTES_SAVE_DEBOUNCE_MS = 1000;

/** One cookie/data-flow triage table row. */
export const CookieRow = memo(function CookieRow({ purpose, row }: CookieRowProps) {
  const { triageType, purposeOptions } = useCookieTriageState();
  const { decide, undo, askOpinion, updateNotes, updatePurpose } = useCookieTriageActions();
  const [asking, setAsking] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [actionError, setActionError] = useState<string | undefined>();
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState(row.notes);
  const [notesError, setNotesError] = useState<string | undefined>();
  const [notesSaving, setNotesSaving] = useState(false);
  const notesDraftRef = useRef(notesDraft);
  notesDraftRef.current = notesDraft;
  const updateNotesRef = useRef(updateNotes);
  updateNotesRef.current = updateNotes;
  const notesSaveIdRef = useRef(0);
  const cookie = row.initial;
  const dormant = isDormantCookie(cookie);
  const selectedPurposes = selectRowPurposeSlugs(row);
  const decided = row.decision;
  const isDecided = decided === 'approve' || decided === 'junk';
  const busy = asking || mutating;
  const notesDirty = notesDraft !== row.notes;
  const itemNoun = triageType === 'cookies' ? 'cookie' : 'data flow';
  const hasSavedNotes = row.notes.trim().length > 0;

  useEffect(() => {
    if (!notesDirty) {
      return undefined;
    }

    const handle = window.setTimeout(() => {
      const value = notesDraftRef.current;
      if (value === row.notes) {
        return;
      }

      const saveId = notesSaveIdRef.current + 1;
      notesSaveIdRef.current = saveId;
      setNotesSaving(true);
      setNotesError(undefined);
      void updateNotesRef
        .current(purpose, row.name, value)
        .catch((error: unknown) => {
          if (saveId !== notesSaveIdRef.current) {
            return;
          }
          const message = error instanceof Error ? error.message : 'Failed to save note';
          setNotesError(message);
          console.error('[cookie-triage] updateNotes failed', error);
        })
        .finally(() => {
          if (saveId === notesSaveIdRef.current) {
            setNotesSaving(false);
          }
        });
    }, NOTES_SAVE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(handle);
    };
  }, [notesDirty, notesDraft, purpose, row.name, row.notes]);

  async function onDecision(next: CookieTriageDecision): Promise<void> {
    if (mutating || next === row.decision) {
      return;
    }
    setMutating(true);
    setActionError(undefined);
    try {
      await decide(purpose, row.name, next);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save decision';
      setActionError(message);
      console.error('[cookie-triage] decide failed', error);
    } finally {
      setMutating(false);
    }
  }

  async function onUndo(): Promise<void> {
    if (mutating || row.decision === undefined) {
      return;
    }
    setMutating(true);
    setActionError(undefined);
    try {
      await undo(purpose, row.name);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to undo decision';
      setActionError(message);
      console.error('[cookie-triage] undo failed', error);
    } finally {
      setMutating(false);
    }
  }

  async function onAskOpinion(): Promise<void> {
    if (asking) {
      return;
    }
    setAsking(true);
    setActionError(undefined);
    try {
      await askOpinion(purpose, row.name);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to ask for a recommendation';
      setActionError(message);
      console.error('[cookie-triage] askOpinion failed', error);
    } finally {
      setAsking(false);
    }
  }

  async function onPurposesChange(trackingPurposes: string[]): Promise<void> {
    if (mutating) {
      return;
    }
    setMutating(true);
    setActionError(undefined);
    try {
      await updatePurpose(purpose, row.name, trackingPurposes);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update purposes';
      setActionError(message);
      console.error('[cookie-triage] updatePurpose failed', error);
    } finally {
      setMutating(false);
    }
  }

  function onToggleNotes(): void {
    setNotesOpen((open) => {
      if (!open) {
        setNotesError(undefined);
        if (!notesDirty) {
          setNotesDraft(row.notes);
        }
      }
      return !open;
    });
  }

  return (
    <>
      <tr
        className={`align-middle ${hasSavedNotes || notesOpen ? '' : 'border-b border-line-subtle'}`}
      >
        <td className="px-4 py-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-content break-all">{cookie.name}</span>
            <span className="text-sm text-content-muted">{cookie.service ?? 'Unknown'}</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-content">{formatEncounters(cookie.occurrences)}</span>
            <span className="text-sm text-content-muted">
              {formatLastActivity(cookie.lastActivityAt)}
            </span>
            {dormant ? (
              <span className="mt-0.5 inline-flex w-fit items-center rounded-sm bg-fill-dormant px-1.5 py-0.5 text-sm font-semibold uppercase tracking-wide text-content-inverse">
                DORMANT
              </span>
            ) : null}
          </div>
        </td>
        <td className="px-4 py-3">
          <PurposeMultiSelect
            itemName={cookie.name}
            selected={selectedPurposes}
            options={purposeOptions}
            disabled={busy}
            onChange={onPurposesChange}
          />
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2.5" role="group" aria-label="Decision">
              <button
                type="button"
                className={ACTION_TEXT}
                title="Ask the assistant what action to take"
                disabled={busy}
                aria-busy={asking}
                onClick={() => {
                  void onAskOpinion();
                }}
              >
                {asking ? 'Asking…' : 'Ask Agent'}
              </button>
              <button
                type="button"
                className={notesOpen || hasSavedNotes ? DECISION_ACTIVE : DECISION_IDLE}
                aria-label={notesOpen ? 'Close note' : 'Add note'}
                aria-pressed={notesOpen}
                title={notesOpen ? 'Close note' : 'Add note'}
                onClick={onToggleNotes}
              >
                <CommentIcon />
              </button>
              {isDecided ? (
                <>
                  <span
                    className="inline-flex h-9 shrink-0 items-center rounded-sm border border-brand-text bg-surface px-2.5 text-sm font-medium text-brand-text"
                    aria-label={`Decision: ${decisionReadLabel(decided)}`}
                  >
                    {decisionReadLabel(decided)}
                  </span>
                  <button
                    type="button"
                    className={ACTION_TEXT}
                    aria-label="Undo decision"
                    disabled={busy}
                    aria-busy={mutating}
                    onClick={() => {
                      void onUndo();
                    }}
                  >
                    {mutating ? 'Undoing…' : 'Undo'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className={DECISION_IDLE}
                    aria-label="Approve"
                    disabled={busy}
                    aria-busy={mutating}
                    onClick={() => {
                      void onDecision('approve');
                    }}
                  >
                    <CheckIcon />
                  </button>
                  <button
                    type="button"
                    className={DECISION_IDLE}
                    aria-label="Junk"
                    disabled={busy}
                    aria-busy={mutating}
                    onClick={() => {
                      void onDecision('junk');
                    }}
                  >
                    <CloseIcon />
                  </button>
                  <button
                    type="button"
                    className={DECISION_IDLE}
                    aria-label="Delete"
                    disabled
                    title="Delete is not available yet"
                  >
                    <TrashIcon />
                  </button>
                </>
              )}
            </div>
            {actionError ? (
              <p className="text-sm text-danger" role="alert">
                {actionError}
              </p>
            ) : null}
          </div>
        </td>
      </tr>
      {hasSavedNotes && !notesOpen ? (
        <tr className="border-b border-line-subtle">
          <td colSpan={4} className="px-4 pb-3">
            <div className="flex flex-wrap items-baseline gap-1.5">
              <span className="inline-flex items-center rounded-sm bg-fill-neutral px-1.5 py-0.5 text-sm font-semibold uppercase tracking-wide text-brand-text">
                Note
              </span>
              <span className="min-w-0 flex-1 text-sm text-content-muted break-words">
                {row.notes}
              </span>
              <button
                type="button"
                className="shrink-0 cursor-pointer text-sm font-medium text-brand-text hover:underline"
                onClick={onToggleNotes}
              >
                Edit
              </button>
            </div>
          </td>
        </tr>
      ) : null}
      {notesOpen ? (
        <tr className="border-b border-line-subtle bg-surface-sunken">
          <td colSpan={4} className="px-4 py-3">
            <label className="flex flex-col gap-2">
              <span className="sr-only">Note for {cookie.name}</span>
              <textarea
                className="min-h-24 w-full resize-y rounded-sm border border-line bg-surface px-3 py-2 text-sm text-content placeholder:text-content-muted focus:border-brand-text focus:outline-none"
                placeholder={`Note for the team — why this decision, who owns the ${itemNoun}, what to check next`}
                value={notesDraft}
                onChange={(event) => {
                  setNotesDraft(event.target.value);
                }}
              />
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <p className="text-sm text-content-muted">
                Writes to the Notes field on this {itemNoun} in the dashboard.
                {notesSaving ? ' Saving…' : notesDirty ? ' Unsaved changes…' : null}
              </p>
              {notesError ? (
                <p className="text-sm text-danger" role="alert">
                  {notesError}
                </p>
              ) : null}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
});
