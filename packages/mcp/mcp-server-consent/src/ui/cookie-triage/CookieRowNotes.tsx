import { Button, ButtonVariant, StatusBadge } from '@transcend-io/mcp-ui-common';
import { memo, useEffect, useState } from 'react';

import type { ConsentTriageType } from '../../lib/cookieTriageTypes.ts';
import { triageCopy } from './cookieTriageCopy.ts';
import type { CookieRowState } from './cookieTriageState.ts';

interface CookieRowNotesProps {
  /** Cookies vs data flows (copy) */
  triageType: ConsentTriageType;
  /** Live row state */
  row: CookieRowState;
  /** Persist notes for this row */
  onSave: (notes: string) => Promise<void>;
  /** Whether the notes editor is open */
  open: boolean;
  /** Toggle the notes editor */
  onToggle: () => void;
}

/** Saved-note preview row and inline notes editor for one triage item. */
export const CookieRowNotes = memo(function CookieRowNotes({
  triageType,
  row,
  onSave,
  open,
  onToggle,
}: CookieRowNotesProps) {
  const { singular } = triageCopy(triageType);
  const [notesDraft, setNotesDraft] = useState(row.notes);
  const [notesError, setNotesError] = useState<string | undefined>();
  const [notesSaving, setNotesSaving] = useState(false);
  const notesDirty = notesDraft !== row.notes;
  const hasSavedNotes = row.notes.trim().length > 0;

  useEffect(() => {
    if (open) {
      setNotesError(undefined);
      setNotesDraft(row.notes);
    }
  }, [open, row.notes]);

  function cancelNotes(): void {
    if (notesSaving) {
      return;
    }
    setNotesError(undefined);
    setNotesDraft(row.notes);
    onToggle();
  }

  async function onSaveNotes(): Promise<void> {
    if (notesSaving || !notesDirty) {
      return;
    }
    setNotesSaving(true);
    setNotesError(undefined);
    try {
      await onSave(notesDraft);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save note';
      setNotesError(message);
    } finally {
      setNotesSaving(false);
    }
  }

  return (
    <>
      {hasSavedNotes && !open ? (
        <tr className="border-b border-card-line">
          <td colSpan={4} className="px-4 pb-3">
            <div className="inline-flex items-baseline gap-1.5 max-w-[60%]">
              <StatusBadge>Note</StatusBadge>
              <span className="min-w-0 flex-1 text-sm text-on-card-muted break-words">
                {row.notes}
              </span>
              <Button
                variant={ButtonVariant.Text}
                className="flex-0 font-semibold"
                onClick={onToggle}
              >
                Edit
              </Button>
            </div>
          </td>
        </tr>
      ) : null}
      {open ? (
        <tr className="border-b border-card-line bg-card-sunken">
          <td colSpan={4} className="px-4 py-3">
            <label className="flex flex-col gap-2">
              <span className="sr-only">Note for {row.initial.name}</span>
              <textarea
                className="min-h-24 w-full resize-y rounded-sm border border-card-line bg-card px-3 py-2 text-sm text-on-card placeholder:text-on-card-muted focus:border-brand-text focus:outline-none"
                placeholder={`Note for the team — why this decision, who owns the ${singular}, what to check next`}
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
              <Button variant={ButtonVariant.Text} disabled={notesSaving} onClick={cancelNotes}>
                Cancel
              </Button>
            </div>
            <p className="mt-2 text-sm text-on-card-muted">
              Writes to the Notes field on this {singular} in the dashboard.
            </p>
            {notesError ? (
              <p className="mt-1 text-sm text-danger" role="alert">
                {notesError}
              </p>
            ) : null}
          </td>
        </tr>
      ) : null}
    </>
  );
});
