import { makeEnum } from '@transcend-io/type-utils';
import type { ReactNode } from 'react';

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
}

const TONE_CLASS: Record<CountBadgeTone, string> = {
  [CountBadgeTone.Active]:
    'inline-flex min-w-5 items-center justify-center rounded-full bg-brand px-1.5 py-0.5 text-xs font-medium text-content-inverse',
  [CountBadgeTone.Idle]:
    'inline-flex min-w-5 items-center justify-center rounded-full bg-content-subtle px-1.5 py-0.5 text-xs font-medium text-content-inverse',
};

/** Pill count used in tabs and similar chrome. */
export function CountBadge({ count, tone = CountBadgeTone.Idle }: CountBadgeProps) {
  return <span className={TONE_CLASS[tone]}>{count}</span>;
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
    'inline-flex items-center rounded-sm bg-fill-neutral px-1.5 py-0.5 text-sm font-semibold uppercase tracking-wide text-brand-text',
  [StatusBadgeTone.Emphasis]:
    'inline-flex w-fit items-center rounded-sm bg-fill-dormant px-1.5 py-0.5 text-sm font-semibold uppercase tracking-wide text-content-inverse',
};

/** Small status chip for labels like Note or Dormant. */
export function StatusBadge({ children, tone = StatusBadgeTone.Neutral }: StatusBadgeProps) {
  return <span className={STATUS_CLASS[tone]}>{children}</span>;
}
