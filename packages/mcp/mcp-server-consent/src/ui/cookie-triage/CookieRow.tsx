import {
  Button,
  ButtonVariant,
  SparkleIcon,
  StatusBadge,
  StatusBadgeTone,
} from '@transcend-io/mcp-ui-common';
import { memo, useCallback, useEffect, useRef, useState } from 'react';

import type { CookieTriagePurposeCategory } from '../../lib/resolvePrimaryCookiePurpose.ts';
import { CookieRowNotes } from './CookieRowNotes.tsx';
import {
  useCookieTriageActions,
  useCookieTriageMeta,
  useRequestDelete,
} from './CookieTriageContext.tsx';
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
import {
  CookieTriageRowAction,
  defaultRowAction,
  formatSuggestionLine,
  nextPrimaryAfterSuggestionChange,
  type CookieTriageRowAction as CookieTriageRowActionValue,
} from './rowActions.ts';
import { RowActionSplitButton } from './RowActionSplitButton.tsx';

interface CookieRowProps {
  /** Purpose tab this row belongs to */
  purpose: CookieTriagePurposeCategory;
  /** Live row state */
  row: CookieRowState;
}

/** One cookie/data-flow triage table row. */
export const CookieRow = memo(function CookieRow({ purpose, row }: CookieRowProps) {
  const { triageType, purposeOptions, supportsPermanentDelete } = useCookieTriageMeta();
  const { decide, undo, askOpinion, updateNotes, updatePurpose } = useCookieTriageActions();
  const requestDelete = useRequestDelete();
  const [asking, setAsking] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [actionError, setActionError] = useState<string | undefined>();
  const [notesOpen, setNotesOpen] = useState(false);
  const cookie = row.initial;
  const dormant = isDormantCookie(cookie);
  const suggestion = suggestRowDecision(row);
  const [primaryAction, setPrimaryAction] = useState<CookieTriageRowActionValue>(() =>
    defaultRowAction(suggestion),
  );
  const previousSuggestionRef = useRef(suggestion);
  const selectedPurposes = selectRowPurposeSlugs(row);
  const decided = row.decision;
  const isDecided =
    decided === CookieTriageDecision.Approve || decided === CookieTriageDecision.Junk;
  const busy = asking || mutating;
  const hasSavedNotes = row.notes.trim().length > 0;
  const suggestionLine = formatSuggestionLine(suggestion);
  const hasSuggestion = suggestion !== undefined;

  useEffect(() => {
    const previousSuggestion = previousSuggestionRef.current;
    previousSuggestionRef.current = suggestion;
    if (previousSuggestion === suggestion) {
      return;
    }
    setPrimaryAction((current) =>
      nextPrimaryAfterSuggestionChange(current, previousSuggestion, suggestion),
    );
  }, [suggestion]);

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

  function onExecuteRowAction(action: CookieTriageRowActionValue): void {
    switch (action) {
      case CookieTriageRowAction.Approve:
        void onDecision(CookieTriageDecision.Approve);
        break;
      case CookieTriageRowAction.Junk:
        void onDecision(CookieTriageDecision.Junk);
        break;
      case CookieTriageRowAction.LeaveComment:
        setNotesOpen(true);
        break;
      case CookieTriageRowAction.DeleteRecord:
        setNotesOpen(false);
        requestDelete({
          purpose,
          name: row.name,
          itemLabel: cookie.name,
        });
        break;
      default:
        break;
    }
  }

  return (
    <>
      <tr className={`align-top ${hasSavedNotes || notesOpen ? '' : 'border-b border-card-line'}`}>
        <td className="min-w-0 px-4 py-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="block truncate text-sm font-medium text-on-card" title={cookie.name}>
              {cookie.name}
            </span>
            <span className="text-sm text-on-card-muted break-words">
              {cookie.service ?? 'Unknown'}
            </span>
          </div>
        </td>
        <td className="min-w-0 px-4 py-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-sm tabular-nums text-on-card">
              {formatEncounters(cookie.occurrences)}
            </span>
            <span className="text-sm text-on-card-muted break-words">
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
        <td className="min-w-0 px-4 py-3">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2.5" role="group" aria-label="Decision">
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
                <RowActionSplitButton
                  primary={primaryAction}
                  supportsPermanentDelete={supportsPermanentDelete}
                  disabled={busy}
                  busy={mutating}
                  onPrimaryChange={setPrimaryAction}
                  onExecute={onExecuteRowAction}
                />
              )}
              <Button
                variant={ButtonVariant.Action}
                title="Ask the assistant what action to take"
                disabled={busy}
                aria-busy={asking}
                onClick={() => {
                  void onAskOpinion();
                }}
              >
                Ask agent
              </Button>
            </div>
            {!isDecided ? (
              <p
                className={`inline-flex items-center gap-1 text-sm ${
                  hasSuggestion ? 'text-brand' : 'text-on-card-muted'
                }`}
              >
                {hasSuggestion ? <SparkleIcon width={12} height={12} /> : null}
                <span>{suggestionLine}</span>
              </p>
            ) : null}
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
