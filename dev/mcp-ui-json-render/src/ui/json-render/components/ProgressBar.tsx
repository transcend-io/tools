import type { z } from 'zod';

import type { ProgressBarPropsSchema, ProgressToneSchema } from '../../../catalog.ts';

type ProgressBarProps = z.infer<typeof ProgressBarPropsSchema>;
type ProgressTone = z.infer<typeof ProgressToneSchema>;

/**
 * Bars and swatches paint with the `fill` family, not the status text colors.
 * `text-success` and friends resolve to near-black green and brown, which is
 * right for type on white and unreadable as a shape.
 */
const TONE_FILL: Record<ProgressTone, string> = {
  brand: 'bg-fill-brand',
  success: 'bg-fill-success',
  warning: 'bg-fill-warning',
  danger: 'bg-fill-danger',
  neutral: 'bg-fill-neutral',
};

/**
 * Segmented progress bar for triage or composition breakdowns.
 *
 * Segment widths are proportional to their values. A single segment against a
 * neutral track is just one entry in `segments` whose value is the filled
 * portion — pass a second neutral segment for the remainder when needed.
 */
export function ProgressBar({ props }: { props: ProgressBarProps }) {
  const total = props.segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0);
  const safeTotal = total > 0 ? total : 1;

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-card-line bg-card px-4 py-4 shadow-sm">
      <h3 className="text-base font-semibold text-on-card">{props.label}</h3>
      <div
        className="flex h-2.5 overflow-hidden rounded-full bg-card-sunken"
        role="img"
        aria-label={props.label}
      >
        {props.segments.map((segment) => {
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
        {props.segments.map((segment) => (
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
      {props.caption ? <p className="text-sm text-on-card-muted">{props.caption}</p> : null}
    </section>
  );
}
