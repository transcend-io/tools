import type { ComponentType, SVGProps } from 'react';

/** Props for {@link SvgIcon}. */
export interface SvgIconProps extends SVGProps<SVGSVGElement> {
  /**
   * Raw SVG markup from a text import (`import icon from './icon.svg'`).
   * Author with `fill="currentColor"` / `stroke="currentColor"` so host theme colors apply.
   */
  svg: string;
}

const ROOT_SVG = /^<svg\b([^>]*)>([\s\S]*)<\/svg>\s*$/i;

/**
 * Renders an imported SVG string as an icon, merging React props onto the root
 * `<svg>` so size, className, and aria attributes work like the hand-written icons.
 */
export function SvgIcon({
  svg,
  width = 16,
  height = 16,
  'aria-hidden': ariaHidden = true,
  ...props
}: SvgIconProps) {
  const match = ROOT_SVG.exec(svg.trim());
  if (!match) {
    throw new Error('SvgIcon expected a single root <svg>…</svg> document');
  }

  const [, attributeText = '', innerHtml = ''] = match;
  const viewBox = readSvgAttribute(attributeText, 'viewBox') ?? '0 0 16 16';
  const fill = readSvgAttribute(attributeText, 'fill') ?? 'none';

  return (
    <svg
      viewBox={viewBox}
      fill={fill}
      width={width}
      height={height}
      aria-hidden={ariaHidden}
      {...props}
      dangerouslySetInnerHTML={{ __html: innerHtml }}
    />
  );
}

/**
 * Builds a named icon component from an imported SVG string.
 *
 * Prefer this for domain-local icons so each `.svg` stays in its own module and
 * only ships in views that import it. Shared kit icons can use the same helper.
 *
 * @param svg - Raw SVG markup
 * @param displayName - React display name for DevTools
 */
export function createSvgIcon(
  svg: string,
  displayName: string,
): ComponentType<SVGProps<SVGSVGElement>> {
  function Icon(props: SVGProps<SVGSVGElement>) {
    return <SvgIcon svg={svg} {...props} />;
  }
  Icon.displayName = displayName;
  return Icon;
}

/**
 * Reads a single attribute from the opening `<svg …>` attribute text.
 *
 * @param attributeText - Attribute string between `<svg` and `>`
 * @param name - Attribute name to read
 * @returns Attribute value, or undefined when absent
 */
function readSvgAttribute(attributeText: string, name: string): string | undefined {
  const match = new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i').exec(attributeText);
  return match?.[1];
}
