import { makeEnum } from '@transcend-io/type-utils';

/** How MetricCard formats a raw number. */
export const MetricFormat = makeEnum({
  /** Compact notation, e.g. `1.2K` */
  Compact: 'compact',
  /** Grouped digits, e.g. `1,284` */
  Number: 'number',
  /** Percentage of 1, e.g. `78%` */
  Percent: 'percent',
});

export type MetricFormat = (typeof MetricFormat)[keyof typeof MetricFormat];

/** Visual tone for a MetricCard note. */
export const MetricTone = makeEnum({
  /** Settled / healthy */
  Positive: 'positive',
  /** Error or regression */
  Negative: 'negative',
  /** Informational, no judgement */
  Neutral: 'neutral',
});

export type MetricTone = (typeof MetricTone)[keyof typeof MetricTone];

/** Props for {@link MetricCard}. */
export interface MetricCardProps {
  /** Small label above the value */
  label: string;
  /** Raw numeric value; the component formats it */
  value: number;
  /** How to format value; defaults to compact */
  format?: MetricFormat;
  /** Optional status note under the value */
  note?: {
    /** Note text */
    text: string;
    /** Visual tone */
    tone: MetricTone;
  };
}

const TONE_CLASS: Record<MetricTone, string> = {
  [MetricTone.Positive]: 'text-success',
  [MetricTone.Negative]: 'text-danger',
  [MetricTone.Neutral]: 'text-on-card-muted',
};

/** Formats a raw number the way MetricCard displays it. */
function formatMetric(value: number, format: MetricFormat | undefined): string {
  const resolved = format ?? MetricFormat.Compact;
  if (resolved === MetricFormat.Percent) {
    return new Intl.NumberFormat('en', {
      style: 'percent',
      maximumFractionDigits: 1,
    }).format(value);
  }
  if (resolved === MetricFormat.Number) {
    return new Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(value);
  }
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Rounded KPI card: label, large value, optional status note.
 *
 * Styled for the fixed light `card` surface so status text stays legible on
 * dark hosts.
 */
export function MetricCard({ label, value, format, note }: MetricCardProps) {
  const formatted = formatMetric(value, format);

  return (
    <article className="flex flex-col gap-1 rounded-lg border border-card-line bg-card px-4 py-4 shadow-sm">
      <p className="text-sm font-medium text-on-card-muted">{label}</p>
      <p className="text-metric font-semibold text-on-card tabular-nums">{formatted}</p>
      {note ? <p className={`mt-1 text-sm ${TONE_CLASS[note.tone]}`}>{note.text}</p> : null}
    </article>
  );
}
