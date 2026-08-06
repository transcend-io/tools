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
        <button
          type="button"
          className="text-sm font-medium text-brand-text transition-colors hover:not-disabled:underline disabled:cursor-default disabled:opacity-60"
          disabled={disabled}
          onClick={onSkip}
        >
          Skip →
        </button>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-sunken" aria-hidden="true">
        <div className="h-full rounded-full bg-brand" style={{ width: `${progressPercent}%` }} />
      </div>
    </div>
  );
}
