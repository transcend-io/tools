import type { ComponentType, ReactElement, SVGProps } from 'react';

/** React SVG component for a local icon. */
export type IconSvgComponent = ComponentType<SVGProps<SVGSVGElement>>;

/** Props for named icon components and {@link Icon}. */
export interface IconProps {
  /** Accessible label; omit for decorative icons */
  title?: string;
  /** Tailwind size / color utilities (color via `currentColor`) */
  className?: string;
  /** Width and height in CSS pixels */
  size?: number;
}

/** Props for the shared {@link Icon} wrapper. */
export interface IconSvgProps extends IconProps {
  /** SVG component to render */
  svg: IconSvgComponent;
}

/**
 * Shared size / a11y chrome for a local SVG icon.
 *
 * Prefer the named exports (`CheckIcon`, `TrashIcon`, …) from this package so
 * unused icons can be tree-shaken out of MCP App bundles. Color follows
 * `currentColor` — set it with text utilities (e.g. `text-danger`).
 */
export function Icon({ svg: Svg, title, className = '', size = 16 }: IconSvgProps): ReactElement {
  return (
    <Svg
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    />
  );
}
