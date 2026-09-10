import {
  ApproveCheckIcon,
  Button,
  ButtonVariant,
  CancelIcon,
  CommentIcon,
  StatusBadge,
  StatusBadgeTone,
  TrashIcon,
} from '@transcend-io/mcp-ui-common';
import { memo, useCallback, useState } from 'react';

import type { CookieTriagePurposeCategory } from '../../lib/resolvePrimaryCookiePurpose.ts';
import { CookieRowNotes } from './CookieRowNotes.tsx';
import {
  useCookieTriageActions,
  useCookieTriageMeta,
  useRequestDelete,
} from './CookieTriageContext.tsx';
import { triageCopy } from './cookieTriageCopy.ts';
import {
  CookieTriageDecision,
  decisionReadLabel,
  formatEncounters,
  formatLastActivity,
  isDormantCookie,
  selectRowPurposeSlugs,
  suggestRowDecision,
  type CookieRowState,
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
  const { triageType, purposeOptions } = useCookieTriageMeta();
  const { decide, undo, askOpinion, updateNotes, updatePurpose } = useCookieTriageActions();
  const requestDelete = useRequestDelete();
  const [asking, setAsking] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [actionError, setActionError] = useState<string | undefined>();
  const [notesOpen, setNotesOpen] = useState(false);
  const cookie = row.initial;
  const dormant = isDormantCookie(cookie);
  const suggestion = suggestRowDecision(row);
  const selectedPurposes = selectRowPurposeSlugs(row);
  const decided = row.decision;
  const isDecided =
    decided === CookieTriageDecision.Approve || decided === CookieTriageDecision.Junk;
  const busy = asking || mutating;
  const hasSavedNotes = row.notes.trim().length > 0;
  const { singular } = triageCopy(triageType);

  const onDecision = useCallback(
    async (next: CookieTriageDecision): Promise<void> => {
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
    },
    [decide, mutating, purpose, row.decision, row.name],
  );

  const onUndo = useCallback(async (): Promise<void> => {
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
  }, [mutating, purpose, row.decision, row.name, undo]);

  const onAskOpinion = useCallback(async (): Promise<void> => {
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
  }, [askOpinion, asking, purpose, row.name]);

  const onPurposesChange = useCallback(
    async (trackingPurposes: string[]): Promise<void> => {
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
    },
    [mutating, purpose, row.name, updatePurpose],
  );

  const onSaveNotes = useCallback(
    (notes: string) => updateNotes(purpose, row.name, notes),
    [purpose, row.name, updateNotes],
  );

  function onToggleNotes(): void {
    setNotesOpen((open) => !open);
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
                      decided === CookieTriageDecision.Approve ? 'text-success' : 'text-danger'
                    }`}
                    aria-label={`Decision: ${decisionReadLabel(decided)}`}
                  >
                    {decisionReadLabel(decided)}
                  </span>
                  <Button
                    variant={ButtonVariant.Text}
                    className="text-on-card-muted"
                    aria-label="Undo decision"
                    disabled={busy}
                    aria-busy={mutating}
                    onClick={() => {
                      void onUndo();
                    }}
                  >
                    {mutating ? 'Undoing' : 'Undo'}
                  </Button>
                </span>
              ) : (
                <>
                  <Button
                    variant={ButtonVariant.Icon}
                    active={suggestion === CookieTriageDecision.Approve}
                    aria-label="Approve"
                    disabled={busy}
                    aria-busy={mutating}
                    onClick={() => {
                      void onDecision(CookieTriageDecision.Approve);
                    }}
                  >
                    <ApproveCheckIcon />
                  </Button>
                  <Button
                    variant={ButtonVariant.Icon}
                    active={suggestion === CookieTriageDecision.Junk}
                    aria-label="Junk"
                    disabled={busy}
                    aria-busy={mutating}
                    onClick={() => {
                      void onDecision(CookieTriageDecision.Junk);
                    }}
                  >
                    <CancelIcon />
                  </Button>
                  <Button
                    variant={ButtonVariant.Icon}
                    aria-label="Delete"
                    disabled={busy}
                    aria-busy={mutating}
                    title={`Permanently delete this ${singular}`}
                    onClick={() => {
                      requestDelete({
                        purpose,
                        name: row.name,
                        itemLabel: cookie.name,
                      });
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
      <CookieRowNotes
        triageType={triageType}
        row={row}
        open={notesOpen}
        onToggle={onToggleNotes}
        onSave={onSaveNotes}
      />
    </>
  );
});
