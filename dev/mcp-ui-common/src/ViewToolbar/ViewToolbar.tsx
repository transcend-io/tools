import type { ReactNode } from 'react';

/** Props for {@link ViewToolbar}. */
export interface ViewToolbarProps {
  /** Meta labels joined with a mid-dot separator (e.g. Scan · Org · Date) */
  labels?: readonly string[];
  /** Right-side actions (refresh, fullscreen, etc.) */
  children?: ReactNode;
}

/**
 * Top chrome row: optional dotted meta labels on the left, action cluster on the right.
 */
export function ViewToolbar({ labels = [], children }: ViewToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 flex-wrap">
        {labels.map((label) => (
          <span
            key={label}
            className="before:content-['·'] before:mr-1 before:ml-1 first:before:content-none uppercase text-sm"
          >
            {label}
          </span>
        ))}
      </div>
      {children ? <div className="flex shrink-0 items-center gap-2">{children}</div> : null}
    </div>
  );
}
