import { makeEnum } from '@transcend-io/type-utils';

/** Segment fill tone for ProgressBar. */
export const ProgressTone = makeEnum({
  /** Brand fill */
  Brand: 'brand',
  /** Live / healthy share */
  Success: 'success',
  /** Needs attention */
  Warning: 'warning',
  /** Harmful or rejected share */
  Danger: 'danger',
  /** Unclassified remainder */
  Neutral: 'neutral',
});

export type ProgressTone = (typeof ProgressTone)[keyof typeof ProgressTone];

/** One segment of a ProgressBar. */
export interface ProgressSegment {
  /** Segment label for the legend */
  label: string;
  /** Absolute count; width is proportional to the sum of all segments */
  value: number;
  /** Fill color */
  tone: ProgressTone;
}

/** Props for {@link ProgressBar}. */
export interface ProgressBarProps {
  /** Title above the bar */
  label: string;
  /** Ordered segments that make up the bar */
  segments: ProgressSegment[];
  /** Optional caption under the legend */
  caption?: string;
}

/**
 * Bars and swatches paint with the `fill` family, not the status text colors.
 * `text-success` and friends resolve to near-black green and brown, which is
 * right for type on white and unreadable as a shape.
 */
const TONE_FILL: Record<ProgressTone, string> = {
  [ProgressTone.Brand]: 'bg-fill-brand',
  [ProgressTone.Success]: 'bg-fill-success',
  [ProgressTone.Warning]: 'bg-fill-warning',
  [ProgressTone.Danger]: 'bg-fill-danger',
  [ProgressTone.Neutral]: 'bg-fill-neutral',
};

/**
 * Segmented progress bar for triage or composition breakdowns.
 *
 * Segment widths are proportional to their values.
 */
export function ProgressBar({ label, segments, caption }: ProgressBarProps) {
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0);
  const safeTotal = total > 0 ? total : 1;

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-card-line bg-card px-4 py-4 shadow-sm">
      <h3 className="text-heading-sm font-semibold text-on-card">{label}</h3>
      <div
        className="flex h-2.5 overflow-hidden rounded-full bg-card-sunken"
        role="img"
        aria-label={label}
      >
        {segments.map((segment) => {
          const widthPercent = (Math.max(0, segment.value) / safeTotal) * 100;
          if (widthPercent <= 0) return null;
          return (
            <div
              key={`${segment.label}-${segment.tone}`}
              className={TONE_FILL[segment.tone]}
              style={{ width: `${widthPercent}%` }}
              title={`${segment.label}: ${segment.value}`}
            />
          );
        })}
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-on-card-muted">
        {segments.map((segment) => (
          <li key={`${segment.label}-legend`} className="flex items-center gap-1.5">
            <span
              className={`inline-block size-2.5 rounded-full ${TONE_FILL[segment.tone]}`}
              aria-hidden="true"
            />
            <span>
              {segment.label}{' '}
              <span className="font-semibold tabular-nums text-on-card">{segment.value}</span>
            </span>
          </li>
        ))}
      </ul>
      {caption ? <p className="text-sm text-on-card-muted">{caption}</p> : null}
    </section>
  );
}
