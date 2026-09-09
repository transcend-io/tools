import { makeEnum } from '@transcend-io/type-utils';
import type { ReactNode } from 'react';

import { CompactCount } from '../CompactCount/CompactCount.tsx';

/** Visual tone for {@link CountBadge}. */
export const CountBadgeTone = makeEnum({
  /** Active / selected tab */
  Active: 'active',
  /** Inactive tab */
  Idle: 'idle',
});

export type CountBadgeTone = (typeof CountBadgeTone)[keyof typeof CountBadgeTone];

/** Props for {@link CountBadge}. */
export interface CountBadgeProps {
  /** Count to display */
  count: number;
  /** Visual tone; defaults to idle */
  tone?: CountBadgeTone;
  /** When true, replaces the count with a ~3ch leading shimmer */
  busy?: boolean;
}

const TONE_CLASS: Record<CountBadgeTone, string> = {
  [CountBadgeTone.Active]: 'bg-brand',
  [CountBadgeTone.Idle]: 'bg-content-subtle',
};

/** Pill count used in tabs and similar chrome. */
export function CountBadge({ count, tone = CountBadgeTone.Idle, busy = false }: CountBadgeProps) {
  return (
    <span
      className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-sm font-medium tabular-nums text-on-fill ${TONE_CLASS[tone]}`}
    >
      <CompactCount value={count} busy={busy} />
    </span>
  );
}

/** Visual tone for {@link StatusBadge}. */
export const StatusBadgeTone = makeEnum({
  /** Neutral chip (e.g. Note) */
  Neutral: 'neutral',
  /** Emphasized chip (e.g. Dormant) */
  Emphasis: 'emphasis',
});

export type StatusBadgeTone = (typeof StatusBadgeTone)[keyof typeof StatusBadgeTone];

/** Props for {@link StatusBadge}. */
export interface StatusBadgeProps {
  /** Badge label */
  children: ReactNode;
  /** Visual tone; defaults to neutral */
  tone?: StatusBadgeTone;
}

const STATUS_CLASS: Record<StatusBadgeTone, string> = {
  [StatusBadgeTone.Neutral]:
    'inline-flex items-center rounded-sm bg-fill-neutral px-1.5 py-0.5 text-sm font-semibold uppercase tracking-wide text-on-card-subtle',
  [StatusBadgeTone.Emphasis]:
    'inline-flex w-fit items-center rounded-sm bg-fill-dormant px-1.5 py-0.5 text-sm font-semibold uppercase tracking-wide text-on-fill',
};

/** Small status chip for labels like Note or Dormant. */
export function StatusBadge({ children, tone = StatusBadgeTone.Neutral }: StatusBadgeProps) {
  return <span className={STATUS_CLASS[tone]}>{children}</span>;
}
