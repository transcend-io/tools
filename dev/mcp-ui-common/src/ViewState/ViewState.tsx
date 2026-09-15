import type { ReactNode } from 'react';

import { Spinner } from '../Spinner/Spinner.tsx';

/**
 * Raised card used for connection / loading / error shells so every view's
 * empty states share the same footprint.
 */
export const VIEW_STATE_CARD =
  'mx-auto w-full max-w-view rounded-lg bg-surface-raised px-6 py-5 shadow-sm';

const TITLE = 'mb-1 text-heading-md font-semibold text-content';
const SUBTITLE = 'text-sm text-content-muted';

/** Props for {@link ViewConnectionError}. */
export interface ViewConnectionErrorProps {
  /** Error message from the host handshake */
  message: string;
  /** Optional secondary line under the message */
  detail?: ReactNode;
  /** Override the default heading */
  title?: string;
}

/** Host-unreachable panel shared by MCP App entry views. */
export function ViewConnectionError({
  message,
  detail,
  title = 'Could not reach the host',
}: ViewConnectionErrorProps) {
  return (
    <section className={`${VIEW_STATE_CARD} border-l-4 border-l-danger`} role="alert">
      <h1 className={TITLE}>{title}</h1>
      <p className="text-sm text-danger whitespace-pre-wrap break-words">{message}</p>
      {detail ? <div className={`${SUBTITLE} mt-2`}>{detail}</div> : null}
    </section>
  );
}

/** Props for {@link ViewLoadingCard}. */
export interface ViewLoadingCardProps {
  /** Status label under the spinner */
  label: string;
}

/** Connecting / first-load card with the branded spinner. */
export function ViewLoadingCard({ label }: ViewLoadingCardProps) {
  return (
    <section className={VIEW_STATE_CARD} aria-busy="true">
      <Spinner label={label} />
    </section>
  );
}
