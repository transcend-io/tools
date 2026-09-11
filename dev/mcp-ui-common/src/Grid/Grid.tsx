import type { ReactNode } from 'react';

/** Props for {@link Grid}. */
export interface GridProps {
  /** Number of equal columns (1–4) once the row is wide enough for them */
  columns: 1 | 2 | 3 | 4;
  /** Grid children */
  children?: ReactNode;
}

const COLUMN_CLASS: Record<1 | 2 | 3 | 4, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 @min-[24rem]:grid-cols-2',
  3: 'grid-cols-1 @min-[24rem]:grid-cols-2 @min-[36rem]:grid-cols-3',
  4: 'grid-cols-1 @min-[24rem]:grid-cols-2 @min-[48rem]:grid-cols-4',
};

/**
 * Equal-column grid for laying out MetricCards or stacking sections.
 *
 * columns: 1 with vertical gap is the implicit page stack.
 */
export function Grid({ columns, children }: GridProps) {
  // The wrapper is what the columns below measure; an element cannot query itself.
  return (
    <div className="@container">
      <div className={`grid gap-3 ${COLUMN_CLASS[columns]}`}>{children}</div>
    </div>
  );
}
