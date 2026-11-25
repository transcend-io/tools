import { makeEnum } from '@transcend-io/type-utils';
import type { ReactElement } from 'react';

import './compact-count.css';

/** How {@link formatCompactCount} abbreviates values ≥ 1K. */
export const CompactCountFormat = makeEnum({
  /** Whole-number compact, e.g. `21K`, `103M` */
  Whole: 'whole',
  /** Three significant digits, e.g. `21.2K`, `103M` */
  Significant: 'significant',
});

export type CompactCountFormat = (typeof CompactCountFormat)[keyof typeof CompactCountFormat];

/** Props for {@link CompactCount}. */
export interface CompactCountProps {
  /** Count to display */
  value: number;
  /** When true, replaces the value with a ~3ch leading shimmer */
  busy?: boolean;
  /** Compact abbreviation style; defaults to whole */
  format?: CompactCountFormat;
  /** Optional class on the outer span */
  className?: string;
}

/**
 * Compact count: under 1K as-is, then abbreviated (≥1K).
 *
 * - {@link CompactCountFormat.Whole}: `21K`, `103M`
 * - {@link CompactCountFormat.Significant}: `21.2K`, `103M`
 */
export function formatCompactCount(
  count: number,
  format: CompactCountFormat = CompactCountFormat.Whole,
): string {
  if (!Number.isFinite(count)) {
    return '0';
  }
  const rounded = Math.round(count);
  if (Math.abs(rounded) < 1000) {
    return String(rounded);
  }
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    ...(format === CompactCountFormat.Significant
      ? { maximumSignificantDigits: 3 }
      : { maximumFractionDigits: 0 }),
  }).format(rounded);
}

/** ~3ch leading-edge shimmer used while a compact count is refreshing. */
export function CompactCountShimmer(): ReactElement {
  return <span className="compact-count-shimmer" aria-hidden />;
}

/** Formatted compact count, or a shimmer placeholder when busy. */
export function CompactCount({
  value,
  busy = false,
  format = CompactCountFormat.Whole,
  className,
}: CompactCountProps): ReactElement {
  // `1lh` matches the count's line box; `1em` was shorter and collapsed the badge.
  const layoutClass = busy ? 'inline-flex h-[1lh] items-center' : 'inline-flex items-center';

  return (
    <span
      className={className ? `${layoutClass} ${className}` : layoutClass}
      aria-busy={busy || undefined}
    >
      {busy ? <CompactCountShimmer /> : formatCompactCount(value, format)}
    </span>
  );
}
