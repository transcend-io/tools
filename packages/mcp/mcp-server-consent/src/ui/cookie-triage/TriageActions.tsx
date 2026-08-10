import { Button } from '@transcend-io/mcp-app-ui';

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
      <Button variant="success" disabled={disabled} onClick={onApprove}>
        ✓ Approve
      </Button>
      <Button variant="danger" disabled={disabled} onClick={onJunk}>
        🗑 Junk
      </Button>
    </div>
  );
}
