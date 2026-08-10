import type { PropsWithChildren } from 'react';

/** Tailwind class for raised-surface chrome used by MCP App cards. */
const CARD_CLASS = 'rounded-lg border border-line bg-surface-raised p-5 shadow-sm';

/** Props for {@link Card}. */
export interface CardProps extends PropsWithChildren<{ className?: string }> {}

/**
 * Raised surface card chrome for MCP App views.
 */
export function Card({ children, className = '' }: CardProps) {
  return <div className={`${CARD_CLASS} ${className}`}>{children}</div>;
}
