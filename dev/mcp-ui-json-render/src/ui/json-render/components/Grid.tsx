import type { ReactNode } from 'react';
import type { z } from 'zod';

import type { GridPropsSchema } from '../../../catalog.ts';

type GridProps = z.infer<typeof GridPropsSchema>;

const COLUMN_CLASS: Record<1 | 2 | 3 | 4, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
};

/**
 * Equal-column grid for laying out MetricCards or stacking sections.
 *
 * columns: 1 with vertical gap is the implicit page stack — put Headings,
 * nested Grids, and ProgressBars as children.
 */
export function Grid({ props, children }: { props: GridProps; children?: ReactNode }) {
  const columns = Math.min(4, Math.max(1, Math.round(props.columns))) as 1 | 2 | 3 | 4;
  return <div className={`grid gap-3 ${COLUMN_CLASS[columns]}`}>{children}</div>;
}
