import type { z } from 'zod';

import type {
  MetricCardPropsSchema,
  MetricFormatSchema,
  MetricToneSchema,
} from '../../../catalog.ts';

type MetricCardProps = z.infer<typeof MetricCardPropsSchema>;
type MetricFormat = z.infer<typeof MetricFormatSchema>;
type MetricTone = z.infer<typeof MetricToneSchema>;

const TONE_CLASS: Record<MetricTone, string> = {
  positive: 'text-success',
  negative: 'text-danger',
  neutral: 'text-on-card-muted',
};

/** Formats a raw number the way MetricCard displays it. */
function formatMetric(value: number, format: MetricFormat | null | undefined): string {
  const resolved = format ?? 'compact';
  if (resolved === 'percent') {
    return new Intl.NumberFormat('en', {
      style: 'percent',
      maximumFractionDigits: 1,
    }).format(value);
  }
  if (resolved === 'number') {
    return new Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(value);
  }
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Rounded KPI card: label, large value, optional delta or status note.
 *
 * Tone is explicit rather than derived from direction so an increase in opt-outs
 * can render red while an increase in opt-ins renders green.
 */
export function MetricCard({ props }: { props: MetricCardProps }) {
  const formatted = formatMetric(props.value, props.format);
  const deltaTone = props.deltaTone ?? 'neutral';
  const arrow = props.delta?.direction === 'down' ? '↓' : '↑';

  return (
    <article className="flex flex-col gap-1 rounded-lg border border-card-line bg-card px-4 py-4 shadow-sm">
      <p className="text-sm font-medium text-on-card-muted">{props.label}</p>
      <p className="text-metric font-semibold text-on-card tabular-nums">{formatted}</p>
      {props.delta ? (
        <p className={`mt-1 text-sm font-medium tabular-nums ${TONE_CLASS[deltaTone]}`}>
          {arrow} {props.delta.value}% {props.delta.label}
        </p>
      ) : null}
      {!props.delta && props.note ? (
        <p className={`mt-1 text-sm ${TONE_CLASS[props.note.tone]}`}>{props.note.text}</p>
      ) : null}
    </article>
  );
}
