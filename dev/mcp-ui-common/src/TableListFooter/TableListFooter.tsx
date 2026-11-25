import type { ReactNode } from 'react';

/** Props for {@link TableListFooter}. */
export interface TableListFooterProps {
  /** `more` shows a count + load control; `done` shows a completion message */
  status: 'more' | 'done';
  /** Rows currently visible */
  shownCount: number;
  /** Total rows in the filtered list */
  totalCount: number;
  /** Completion heading when {@link TableListFooterProps.status} is `done` */
  title?: string;
  /** Completion body when {@link TableListFooterProps.status} is `done` */
  message?: string;
  /** Load-more control rendered under the shown/total count */
  action?: ReactNode;
  /** Extra copy under the action or completion message (e.g. a dashboard link) */
  children?: ReactNode;
}

/**
 * Scroll-container footer for paged tables: remaining rows, or an all-caught-up
 * empty state. Callers own the load-more button and any deep links.
 */
export function TableListFooter({
  status,
  shownCount,
  totalCount,
  title = 'All caught up',
  message,
  action,
  children,
}: TableListFooterProps) {
  if (status === 'done') {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <p className="text-heading-sm font-semibold text-on-card">{title}</p>
        {message ? <p className="text-md text-on-card-muted">{message}</p> : null}
        {children ? <p className="text-sm text-on-card-subtle">{children}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 py-5 text-center">
      <p className="text-sm text-on-card-subtle">
        {shownCount.toLocaleString('en-US')} of {totalCount.toLocaleString('en-US')} shown
      </p>
      {action}
      {children ? <p className="text-sm text-on-card-subtle">{children}</p> : null}
    </div>
  );
}
