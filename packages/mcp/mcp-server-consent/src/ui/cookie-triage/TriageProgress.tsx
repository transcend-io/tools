import { Button, ProgressBar } from '@transcend-io/mcp-app-ui';

import type { CookieTriageReviewType } from './types.js';

/** Props for {@link TriageProgress}. */
export interface TriageProgressProps {
  /** Cookie or data-flow review */
  reviewType: CookieTriageReviewType;
  /** 1-based index of the current item */
  index: number;
  /** Total remaining items in this queue */
  total: number;
  /** Whether an act call is in flight */
  disabled: boolean;
  /** Skip the current item without mutating */
  onSkip: () => void;
}

/**
 * Progress label, bar, and Skip control for the triage card header.
 */
export function TriageProgress({
  reviewType,
  index,
  total,
  disabled,
  onSkip,
}: TriageProgressProps) {
  const kindLabel = reviewType === 'data_flow' ? 'DATA FLOW' : 'COOKIE';
  const progressPercent = total > 0 ? Math.min(100, Math.round((index / total) * 100)) : 0;

  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-content-subtle uppercase">
          {kindLabel} {index} OF {total}
        </p>
        <Button variant="link" disabled={disabled} onClick={onSkip}>
          Skip →
        </Button>
      </div>
      <ProgressBar totalSteps={total} currentStep={index} />
    </div>
  );
}
