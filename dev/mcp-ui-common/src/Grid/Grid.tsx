import type { ReactNode } from 'react';

/** Props for {@link Grid}. */
export interface GridProps {
  /** Number of equal columns (1–4) once past the `lg` breakpoint */
  columns: 1 | 2 | 3 | 4;
  /** Grid children */
  children?: ReactNode;
}

/**
 * Every count stacks below `lg`. A host can be as narrow as a phone-width side
 * panel, and three columns there squeeze a KPI card until its value clips —
 * which is silent, since an overflowing number is still laid out.
 */
const COLUMN_CLASS: Record<1 | 2 | 3 | 4, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 lg:grid-cols-2',
  3: 'grid-cols-1 lg:grid-cols-3',
  4: 'grid-cols-1 lg:grid-cols-4',
};

/**
 * Equal-column grid for laying out MetricCards or stacking sections.
 *
 * columns: 1 with vertical gap is the implicit page stack.
 */
export function Grid({ columns, children }: GridProps) {
  return <div className={`grid gap-3 ${COLUMN_CLASS[columns]}`}>{children}</div>;
}
