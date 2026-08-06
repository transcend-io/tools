/** Props for {@link TriageActions}. */
export interface TriageActionsProps {
  /** Whether an act call is in flight */
  disabled: boolean;
  /** Approve the current item with the draft classification */
  onApprove: () => void;
  /** Junk the current item */
  onJunk: () => void;
}

/**
 * Primary Approve and Junk actions for the triage card.
 */
export function TriageActions({ disabled, onApprove, onJunk }: TriageActionsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        className="rounded-md bg-success px-4 py-3 text-sm font-semibold text-content-inverse transition-opacity hover:not-disabled:opacity-90 disabled:cursor-default disabled:opacity-60"
        disabled={disabled}
        onClick={onApprove}
      >
        ✓ Approve
      </button>
      <button
        type="button"
        className="rounded-md bg-danger px-4 py-3 text-sm font-semibold text-content-inverse transition-opacity hover:not-disabled:opacity-90 disabled:cursor-default disabled:opacity-60"
        disabled={disabled}
        onClick={onJunk}
      >
        🗑 Junk
      </button>
    </div>
  );
}
