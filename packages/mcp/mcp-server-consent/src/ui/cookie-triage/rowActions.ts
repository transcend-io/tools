import { CookieTriageDecision } from '../../lib/cookieTriageTypes.ts';

/** Labeled actions available on an undecided triage row split button. */
export const CookieTriageRowAction = {
  /** Approve and mark LIVE */
  Approve: 'approve',
  /** Mark LIVE + junk */
  Junk: 'junk',
  /** Permanently delete the inventory record */
  DeleteRecord: 'delete_record',
  /** Open the notes editor */
  LeaveComment: 'leave_comment',
} as const;

/** Override type */
export type CookieTriageRowAction =
  (typeof CookieTriageRowAction)[keyof typeof CookieTriageRowAction];

/** Approve/Junk suggestion, or undefined when none. */
export type CookieTriageRowSuggestion =
  | typeof CookieTriageDecision.Approve
  | typeof CookieTriageDecision.Junk
  | undefined;

/**
 * Default primary split-button action for a row.
 *
 * Uses the system suggestion when present; otherwise Approve.
 *
 * @param suggestion - Approve/Junk suggestion, or undefined when none
 */
export function defaultRowAction(suggestion: CookieTriageRowSuggestion): CookieTriageRowAction {
  if (suggestion === CookieTriageDecision.Junk) {
    return CookieTriageRowAction.Junk;
  }
  return CookieTriageRowAction.Approve;
}

/**
 * Next primary after the system suggestion changes.
 *
 * Keeps a user-selected primary when it no longer matches the previous default;
 * otherwise follows the new suggestion.
 *
 * @param current - Current primary action
 * @param previousSuggestion - Suggestion before the change
 * @param nextSuggestion - Suggestion after the change
 */
export function nextPrimaryAfterSuggestionChange(
  current: CookieTriageRowAction,
  previousSuggestion: CookieTriageRowSuggestion,
  nextSuggestion: CookieTriageRowSuggestion,
): CookieTriageRowAction {
  if (current === defaultRowAction(previousSuggestion)) {
    return defaultRowAction(nextSuggestion);
  }
  return current;
}

/**
 * Ordered action set for the split button, omitting permanent delete when unsupported.
 *
 * @param supportsPermanentDelete - Whether the host can invoke the app-only delete tool
 */
export function rowActionSet(supportsPermanentDelete: boolean): CookieTriageRowAction[] {
  const actions: CookieTriageRowAction[] = [
    CookieTriageRowAction.Approve,
    CookieTriageRowAction.Junk,
  ];
  if (supportsPermanentDelete) {
    actions.push(CookieTriageRowAction.DeleteRecord);
  }
  actions.push(CookieTriageRowAction.LeaveComment);
  return actions;
}

/**
 * Menu items for the split-button chevron (all actions except the current primary).
 *
 * @param primary - Current primary action
 * @param supportsPermanentDelete - Whether delete is available on this host
 */
export function rowActionMenuItems(
  primary: CookieTriageRowAction,
  supportsPermanentDelete: boolean,
): CookieTriageRowAction[] {
  return rowActionSet(supportsPermanentDelete).filter((action) => action !== primary);
}

/** Visible label for a row action. */
export function rowActionLabel(action: CookieTriageRowAction): string {
  switch (action) {
    case CookieTriageRowAction.Approve:
      return 'Approve';
    case CookieTriageRowAction.Junk:
      return 'Junk';
    case CookieTriageRowAction.DeleteRecord:
      return 'Delete record';
    case CookieTriageRowAction.LeaveComment:
      return 'Leave comment';
    default:
      return action;
  }
}

/**
 * Suggestion line copy for an undecided/decided row.
 *
 * @param suggestion - Approve/Junk suggestion, or undefined when none
 */
export function formatSuggestionLine(suggestion: CookieTriageRowSuggestion): string {
  if (suggestion === CookieTriageDecision.Approve) {
    return 'Suggested: approve';
  }
  if (suggestion === CookieTriageDecision.Junk) {
    return 'Suggested: junk';
  }
  return 'No suggestion';
}
