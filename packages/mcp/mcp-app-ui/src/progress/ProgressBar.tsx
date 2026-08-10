/** Props for {@link ProgressBar}. */
export interface ProgressBarProps {
  /** What step we're currently on (1-indexed) */
  currentStep: number;
  /** How many steps there are total */
  totalSteps: number;
  /** Tailwind class for additional styling on the background */
  backgroundClassName?: string;
  /** Tailwind class for additional styling on the progress bar */
  progressClassName?: string;
}

/**
 * Thin brand-colored progress bar for MCP App views.
 */
export function ProgressBar({
  currentStep,
  totalSteps,
  backgroundClassName = '',
  progressClassName = '',
}: ProgressBarProps) {
  const percentage = (currentStep / totalSteps) * 100;

  return (
    <div
      className={`h-1.5 overflow-hidden rounded-full bg-surface-sunken ${backgroundClassName}`}
      aria-hidden="true"
    >
      <div
        className={`h-full rounded-full bg-brand ${progressClassName}`}
        style={{ width: `${percentage}%`, transition: 'width 0.2s ease-in-out' }}
      />
    </div>
  );
}
