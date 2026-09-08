import { makeEnum } from '@transcend-io/type-utils';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { Spinner, SpinnerVariant } from '../Spinner/Spinner.tsx';

/** Visual style for {@link Button}. */
export const ButtonVariant = makeEnum({
  /** Filled brand action */
  Primary: 'primary',
  /** Compact outlined control matching fullscreen / toolbar chrome */
  Secondary: 'secondary',
  /** Taller text action used in dense rows */
  Action: 'action',
  /** Square icon-only control */
  Icon: 'icon',
});

export type ButtonVariant = (typeof ButtonVariant)[keyof typeof ButtonVariant];

/** Props for {@link Button}. */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style; defaults to secondary */
  variant?: ButtonVariant;
  /** When true, shows a small spinner and disables the control */
  busy?: boolean;
  /** Accessible label announced while busy; defaults to children text when string */
  busyLabel?: string;
  /** Whether the icon variant is in its pressed / selected look */
  active?: boolean;
  /** Button contents */
  children?: ReactNode;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  [ButtonVariant.Primary]:
    'inline-flex cursor-pointer items-center justify-center gap-2 rounded-sm bg-brand px-3 py-1.5 text-sm font-medium text-content-inverse hover:bg-brand-hovered disabled:cursor-not-allowed disabled:opacity-60',
  [ButtonVariant.Secondary]:
    'inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-sm border border-line bg-surface px-2 py-1 text-sm text-content disabled:cursor-not-allowed disabled:opacity-60',
  [ButtonVariant.Action]:
    'inline-flex h-9 shrink-0 cursor-pointer items-center rounded-sm border border-line bg-surface px-2.5 text-sm font-medium text-content-muted hover:text-content disabled:cursor-not-allowed disabled:opacity-60',
  [ButtonVariant.Icon]:
    'inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-sm border bg-surface disabled:cursor-not-allowed disabled:opacity-60',
};

/**
 * Shared button for MCP App chrome and row actions.
 *
 * Icon variant defaults to a muted border; pass `active` for the brand-selected look.
 * When `busy`, a small spinner is prepended — callers typically hide leading icons.
 */
export function Button({
  variant = ButtonVariant.Secondary,
  busy = false,
  busyLabel,
  active = false,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const iconClass = active
    ? `${VARIANT_CLASS[ButtonVariant.Icon]} border-brand-text text-brand-text`
    : `${VARIANT_CLASS[ButtonVariant.Icon]} border-line text-content-muted`;

  const baseClass = variant === ButtonVariant.Icon ? iconClass : VARIANT_CLASS[variant];

  return (
    <button
      type={type}
      className={className ? `${baseClass} ${className}` : baseClass}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...rest}
    >
      {busy ? (
        <Spinner
          variant={SpinnerVariant.Small}
          label={busyLabel ?? (typeof children === 'string' ? children : 'Loading')}
        />
      ) : null}
      {children}
    </button>
  );
}
