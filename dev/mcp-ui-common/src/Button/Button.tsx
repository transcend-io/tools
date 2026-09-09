import { makeEnum } from '@transcend-io/type-utils';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { Spinner, SpinnerVariant } from '../Spinner/Spinner.tsx';

/** Visual style for {@link Button}. */
export const ButtonVariant = makeEnum({
  /** Filled brand action */
  Primary: 'primary',
  /** Compact outlined control */
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
  /** Whether the control is in its pressed / selected look (non-primary variants) */
  active?: boolean;
  /** Button contents */
  children?: ReactNode;
}

/** Shared look for secondary / action / icon. */
const BUTTON_BASE =
  'inline-flex shrink-0 cursor-pointer items-center rounded-sm border bg-card hover:not-disabled:bg-card-sunken disabled:cursor-not-allowed disabled:opacity-60';

const BUTTON_BORDER = {
  idle: 'border-card-line',
  active: 'border-brand',
} as const;

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  [ButtonVariant.Primary]:
    'inline-flex cursor-pointer items-center justify-center gap-2 rounded-sm bg-brand px-3 py-1.5 text-sm font-medium text-on-fill hover:bg-brand-hovered disabled:cursor-not-allowed disabled:opacity-60',
  [ButtonVariant.Secondary]: `${BUTTON_BASE} gap-1.5 px-2 py-1 text-sm text-on-card`,
  [ButtonVariant.Action]: `${BUTTON_BASE} h-9 px-2.5 text-sm font-medium`,
  [ButtonVariant.Icon]: `${BUTTON_BASE} size-9 justify-center`,
};

/**
 * Shared button for MCP App and row actions.
 *
 * Secondary, action, and icon share `bg-card`, inherited text color, and a subtle
 * border — pass `active` for the brand-selected border. When `busy`, a small
 * spinner is prepended — callers typically hide leading icons.
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
  const usesBase = variant !== ButtonVariant.Primary;
  const baseClass = usesBase
    ? `${VARIANT_CLASS[variant]} ${active ? BUTTON_BORDER.active : BUTTON_BORDER.idle}`
    : VARIANT_CLASS[variant];

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
      {variant !== ButtonVariant.Icon || !busy ? children : null}
    </button>
  );
}
