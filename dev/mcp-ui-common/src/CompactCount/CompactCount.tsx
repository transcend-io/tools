import type { ReactElement } from 'react';

import './compact-count.css';

/** Props for {@link CompactCount}. */
export interface CompactCountProps {
  /** Count to display */
  value: number;
  /** When true, replaces the value with a ~3ch leading shimmer */
  busy?: boolean;
  /** Optional class on the outer span */
  className?: string;
}

/**
 * Compact count: under 1K as-is, then 3 significant digits
 * (e.g. `21.2K`, `103M`).
 */
export function formatCompactCount(count: number): string {
  if (!Number.isFinite(count)) {
    return '0';
  }
  const rounded = Math.round(count);
  if (Math.abs(rounded) < 1000) {
    return String(rounded);
  }
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumSignificantDigits: 3,
  }).format(rounded);
}

/** ~3ch leading-edge shimmer used while a compact count is refreshing. */
export function CompactCountShimmer(): ReactElement {
  return <span className="compact-count-shimmer" aria-hidden />;
}

/** Formatted compact count, or a shimmer placeholder when busy. */
export function CompactCount({ value, busy = false, className }: CompactCountProps): ReactElement {
  // `1lh` matches the count's line box; `1em` was shorter and collapsed the badge.
  const layoutClass = busy ? 'inline-flex h-[1lh] items-center' : 'inline-flex items-center';

  return (
    <span
      className={className ? `${layoutClass} ${className}` : layoutClass}
      aria-busy={busy || undefined}
    >
      {busy ? <CompactCountShimmer /> : formatCompactCount(value)}
    </span>
  );
}
