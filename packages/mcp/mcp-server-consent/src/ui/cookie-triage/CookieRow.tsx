import {
  Button,
  ButtonVariant,
  ConfirmDialog,
  StatusBadge,
  StatusBadgeTone,
} from '@transcend-io/mcp-ui-common';
import { memo, useState } from 'react';

import type { CookieTriagePurposeCategory } from '../../lib/resolvePrimaryCookiePurpose.ts';
import { ApproveCheckIcon } from '../_shared/icons/ApproveCheckIcon.tsx';
import { CancelIcon } from '../_shared/icons/CancelIcon.tsx';
import { CommentIcon } from '../_shared/icons/CommentIcon.tsx';
import { TrashIcon } from '../_shared/icons/TrashIcon.tsx';
import { useCookieTriageActions, useCookieTriageState } from './CookieTriageContext.tsx';
import {
  decisionReadLabel,
  formatEncounters,
  formatLastActivity,
  isDormantCookie,
  selectRowPurposeSlugs,
  suggestRowDecision,
  type CookieRowState,
  type CookieTriageDecision,
} from './cookieTriageState.ts';
import { PurposeMultiSelect } from './PurposeMultiSelect.tsx';

interface CookieRowProps {
  /** Purpose tab this row belongs to */
  purpose: CookieTriagePurposeCategory;
  /** Live row state */
  row: CookieRowState;
}

/** One cookie/data-flow triage table row. */
export const CookieRow = memo(function CookieRow({ purpose, row }: CookieRowProps) {
  const { triageType, purposeOptions } = useCookieTriageState();
  const { decide, undo, askOpinion, updateNotes, updatePurpose, remove } = useCookieTriageActions();
  const [asking, setAsking] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [actionError, setActionError] = useState<string | undefined>();
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState(row.notes);
  const [notesError, setNotesError] = useState<string | undefined>();
  const [notesSaving, setNotesSaving] = useState(false);
  const cookie = row.initial;
  const dormant = isDormantCookie(cookie);
  const suggestion = suggestRowDecision(row);
  const selectedPurposes = selectRowPurposeSlugs(row);
  const decided = row.decision;
  const isDecided = decided === 'approve' || decided === 'junk';
  const busy = asking || mutating;
  const notesDirty = notesDraft !== row.notes;
  const itemNoun = triageType === 'cookies' ? 'cookie' : 'data flow';
  const hasSavedNotes = row.notes.trim().length > 0;

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
    } finally {
      setMutating(false);
    }
  }

  async function onDelete(): Promise<void> {
    if (mutating) {
      return;
    }
    setConfirmDeleteOpen(true);
  }

  async function onConfirmDelete(): Promise<void> {
    if (mutating) {
      return;
    }
    setMutating(true);
    setActionError(undefined);
    try {
      await remove(purpose, row.name);
    } catch (error) {
      const message = error instanceof Error ? error.message : `Failed to delete ${itemNoun}`;
      setActionError(message);
      console.error('[cookie-triage] remove failed', error);
      setMutating(false);
      setConfirmDeleteOpen(false);
    }
  }

  function openNotes(): void {
    setNotesError(undefined);
    setNotesDraft(row.notes);
    setNotesOpen(true);
  }

  function cancelNotes(): void {
    if (notesSaving) {
      return;
    }
    setNotesError(undefined);
    setNotesDraft(row.notes);
    setNotesOpen(false);
  }

  function onToggleNotes(): void {
    if (notesOpen) {
      cancelNotes();
      return;
    }
    openNotes();
  }

  async function onSaveNotes(): Promise<void> {
    if (notesSaving || !notesDirty) {
      return;
    }
    setNotesSaving(true);
    setNotesError(undefined);
    try {
      await updateNotes(purpose, row.name, notesDraft);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save note';
      setNotesError(message);
    } finally {
      setNotesSaving(false);
    }
  }

  return (
    <>
      <tr
        className={`align-middle ${hasSavedNotes || notesOpen ? '' : 'border-b border-card-line'}`}
      >
        <td className="px-4 py-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-on-card break-all">{cookie.name}</span>
            <span className="text-sm text-on-card-muted">{cookie.service ?? 'Unknown'}</span>
          </div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm tabular-nums text-on-card">
              {formatEncounters(cookie.occurrences)}
            </span>
            <span className="text-sm text-on-card-muted">
              {formatLastActivity(cookie.lastActivityAt)}
            </span>
            {dormant ? (
              <span className="mt-0.5">
                <StatusBadge tone={StatusBadgeTone.Emphasis}>DORMANT</StatusBadge>
              </span>
            ) : null}
          </div>
        </td>
        <td className="min-w-0 px-4 py-3">
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
              <Button
                variant={ButtonVariant.Action}
                title="Ask the assistant what action to take"
                disabled={busy}
                aria-busy={asking}
                onClick={() => {
                  void onAskOpinion();
                }}
              >
                Ask Agent
              </Button>
              <Button
                variant={ButtonVariant.Icon}
                active={notesOpen || hasSavedNotes}
                aria-label={notesOpen ? 'Close note' : 'Add note'}
                aria-pressed={notesOpen}
                title={notesOpen ? 'Close note' : 'Add note'}
                onClick={onToggleNotes}
              >
                <CommentIcon />
              </Button>
              {isDecided ? (
                <span className="inline-flex items-baseline gap-2 text-sm">
                  <span
                    className={`font-semibold ${
                      decided === 'approve' ? 'text-success' : 'text-danger'
                    }`}
                    aria-label={`Decision: ${decisionReadLabel(decided)}`}
                  >
                    {decisionReadLabel(decided)}
                  </span>
                  <button
                    type="button"
                    className="cursor-pointer bg-transparent text-on-card-muted hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label="Undo decision"
                    disabled={busy}
                    aria-busy={mutating}
                    onClick={() => {
                      void onUndo();
                    }}
                  >
                    {mutating ? 'Undoing' : 'Undo'}
                  </button>
                </span>
              ) : (
                <>
                  <Button
                    variant={ButtonVariant.Icon}
                    active={suggestion === 'approve'}
                    aria-label="Approve"
                    disabled={busy}
                    aria-busy={mutating}
                    onClick={() => {
                      void onDecision('approve');
                    }}
                  >
                    <ApproveCheckIcon />
                  </Button>
                  <Button
                    variant={ButtonVariant.Icon}
                    active={suggestion === 'junk'}
                    aria-label="Junk"
                    disabled={busy}
                    aria-busy={mutating}
                    onClick={() => {
                      void onDecision('junk');
                    }}
                  >
                    <CancelIcon />
                  </Button>
                  <Button
                    variant={ButtonVariant.Icon}
                    aria-label="Delete"
                    disabled={busy}
                    aria-busy={mutating}
                    title={`Permanently delete this ${itemNoun}`}
                    onClick={() => {
                      void onDelete();
                    }}
                  >
                    <TrashIcon />
                  </Button>
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
        <tr className="border-b border-card-line">
          <td colSpan={4} className="px-4 pb-3">
            <div className="inline-flex items-baseline gap-1.5 max-w-[60%]">
              <StatusBadge>Note</StatusBadge>
              <span className="min-w-0 flex-1 text-sm text-on-card-muted break-words">
                {row.notes}
              </span>
              <button
                type="button"
                className="bg-card flex-0 cursor-pointer text-sm font-semibold text-on-card-subtle hover:underline"
                onClick={onToggleNotes}
              >
                Edit
              </button>
            </div>
          </td>
        </tr>
      ) : null}
      {notesOpen ? (
        <tr className="border-b border-card-line bg-card-sunken">
          <td colSpan={4} className="px-4 py-3">
            <label className="flex flex-col gap-2">
              <span className="sr-only">Note for {cookie.name}</span>
              <textarea
                className="min-h-24 w-full resize-y rounded-sm border border-card-line bg-card px-3 py-2 text-sm text-on-card placeholder:text-on-card-muted focus:border-brand-text focus:outline-none"
                placeholder={`Note for the team — why this decision, who owns the ${itemNoun}, what to check next`}
                value={notesDraft}
                disabled={notesSaving}
                onChange={(event) => {
                  setNotesDraft(event.target.value);
                }}
              />
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Button
                variant={ButtonVariant.Primary}
                busy={notesSaving}
                busyLabel="Saving"
                disabled={!notesDirty}
                onClick={() => {
                  void onSaveNotes();
                }}
              >
                Save note
              </Button>
              <button
                type="button"
                className="cursor-pointer bg-transparent text-sm font-medium text-on-card-subtle hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                disabled={notesSaving}
                onClick={cancelNotes}
              >
                Cancel
              </button>
            </div>
            <p className="mt-2 text-sm text-on-card-muted">
              Writes to the Notes field on this {itemNoun} in the dashboard.
            </p>
            {notesError ? (
              <p className="mt-1 text-sm text-danger" role="alert">
                {notesError}
              </p>
            ) : null}
          </td>
        </tr>
      ) : null}
      {confirmDeleteOpen ? (
        <ConfirmDialog
          title={`Delete ${itemNoun} "${cookie.name}"?`}
          confirmLabel="Delete permanently"
          busyLabel="Deleting"
          busy={mutating}
          onCancel={() => {
            if (!mutating) {
              setConfirmDeleteOpen(false);
            }
          }}
          onConfirm={() => {
            void onConfirmDelete();
          }}
        >
          <p>
            This permanently removes the {itemNoun} from your consent manager. It cannot be undone.
          </p>
          <p className="mt-2">Prefer Junk if you only want to hide it from review.</p>
        </ConfirmDialog>
      ) : null}
    </>
  );
});
