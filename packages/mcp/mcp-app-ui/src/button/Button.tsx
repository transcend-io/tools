import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

export const ButtonVariant = {
  Success: 'success',
  Danger: 'danger',
  Brand: 'brand',
  Link: 'link',
} as const;

/** Visual treatment for {@link Button}. */
export type ButtonVariant = (typeof ButtonVariant)[keyof typeof ButtonVariant];

/** Props for {@link Button}. */
export interface ButtonProps extends PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> {
  /** Visual treatment */
  variant?: ButtonVariant;
}

const BASE_CLASS =
  'cursor-pointer disabled:cursor-default disabled:opacity-60 hover:not-disabled:opacity-90 transition-opacity';

/** Class names per {@link ButtonVariant}. */
const VARIANT_CLASS: Record<ButtonVariant, string> = {
  success: 'rounded-md bg-success px-4 py-3 text-sm font-semibold text-content-inverse',
  danger: 'rounded-md bg-danger px-4 py-3 text-sm font-semibold text-content-inverse',
  brand: 'shrink-0 rounded-sm bg-brand px-3.5 py-2 text-sm font-medium text-content-inverse',
  link: 'text-sm font-medium text-brand-text hover:not-disabled:underline bg-transparent',
};

/**
 * Host-themed button for MCP App views.
 */
export function Button({
  variant = ButtonVariant.Brand,
  className = '',
  type = 'button',
  children,
  ...props
}: ButtonProps) {
  const classes = `${BASE_CLASS} ${VARIANT_CLASS[variant]} ${className}`;
  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
}
