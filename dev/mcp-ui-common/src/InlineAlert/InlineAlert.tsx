import type { ReactNode } from 'react';

/** Props for {@link InlineAlert}. */
export interface InlineAlertProps {
  /** Short heading above the body */
  title: string;
  /** Detail message; strings get danger styling */
  message: ReactNode;
  /** Optional follow-up control (e.g. Retry) */
  action?: ReactNode;
}

/**
 * Compact error / warning panel for in-view failures.
 *
 * Used for load errors that should not replace the whole view.
 */
export function InlineAlert({ title, message, action }: InlineAlertProps) {
  return (
    <section
      className="shrink-0 rounded-sm border border-danger/40 bg-surface px-3 py-2"
      role="alert"
    >
      <p className="text-sm font-semibold text-danger">{title}</p>
      {typeof message === 'string' ? (
        <p className="text-sm text-danger whitespace-pre-wrap break-words">{message}</p>
      ) : (
        message
      )}
      {action ? <div className="mt-2">{action}</div> : null}
    </section>
  );
}
