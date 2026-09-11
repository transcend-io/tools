import { makeEnum } from '@transcend-io/type-utils';

import {
  CX,
  CY,
  DEFAULT_SIZE_PX,
  FULL_VIEWBOX,
  INNER_R,
  MIDDLE_SEGMENTS,
  OUTER_SEGMENTS,
  segmentTiming,
  SMALL_SIZE_PX,
  SMALL_STROKE_WIDTH,
  SMALL_VIEWBOX,
  spinnerStyle,
  STROKE_WIDTH,
} from './geometry.ts';

import './spinner.css';

/**
 * Port of `core-ui`'s `LogoSpinner` for MCP App views.
 *
 * Same logomark geometry and motion as the dashboard: outer and middle rings
 * trim along fixed arcs while the inner ring fills from a tip and then spins.
 * Rebuilt without styled-components, since a view ships as one inlined document
 * and styles itself from the shared Tailwind theme.
 */

/** Visual variant for {@link Spinner}. */
export const SpinnerVariant = makeEnum({
  /** Full three-ring logomark */
  Default: 'default',
  /** Solid inner ring only, inline — for buttons and dense UI */
  Small: 'small',
});

export type SpinnerVariant = (typeof SpinnerVariant)[keyof typeof SpinnerVariant];

/** Props for {@link Spinner}. */
export interface SpinnerProps {
  /** Visual variant; defaults to the full logomark */
  variant?: SpinnerVariant;
  /** Display size in CSS pixels; defaults to 55, or 20 when small */
  size?: number;
  /** Stroke color of the animated arcs */
  color?: string;
  /** Color of the ring track behind the arcs */
  trackColor?: string;
  /** Status text; announced either way, rendered only on the default variant */
  label?: string;
}

/**
 * Branded loading animation for MCP App views.
 *
 * Colors default to the fixed light `card` family rather than the host's, so a
 * dark host cannot paint the logomark onto its own background and lose it.
 */
export function Spinner({
  variant = SpinnerVariant.Default,
  size,
  color = 'var(--color-on-card-subtle)',
  trackColor = 'var(--color-card-line)',
  label = 'Loading',
}: SpinnerProps) {
  const isSmall = variant === SpinnerVariant.Small;
  const pixels = size ?? (isSmall ? SMALL_SIZE_PX : DEFAULT_SIZE_PX);

  const svg = (
    <svg
      className="block overflow-visible"
      style={spinnerStyle(isSmall, pixels)}
      viewBox={isSmall ? SMALL_VIEWBOX : FULL_VIEWBOX}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g
        strokeWidth={isSmall ? SMALL_STROKE_WIDTH : STROKE_WIDTH}
        strokeLinecap="round"
        fill="none"
      >
        <g transform={`rotate(-90 ${CX} ${CY})`}>
          <circle cx={CX} cy={CY} r={INNER_R} stroke={trackColor} />
          <circle
            className="transcend-logo-spinner-inner"
            cx={CX}
            cy={CY}
            r={INNER_R}
            stroke={color}
            pathLength={1}
          />
        </g>

        {isSmall
          ? null
          : [
              { segments: MIDDLE_SEGMENTS, seed: 2, name: 'middle' },
              { segments: OUTER_SEGMENTS, seed: 3, name: 'outer' },
            ].map(({ segments, seed, name }) =>
              segments.map((d, index) => (
                <g key={`${name}-${index}`}>
                  <path d={d} stroke={trackColor} />
                  <path
                    className="transcend-logo-spinner-trim"
                    d={d}
                    stroke={color}
                    pathLength={1}
                    style={segmentTiming(seed, index)}
                  />
                </g>
              )),
            )}
      </g>
    </svg>
  );

  if (isSmall) {
    return (
      <span
        className="inline-flex items-center justify-center leading-none"
        role="status"
        aria-label={label}
        aria-busy="true"
      >
        {svg}
      </span>
    );
  }

  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-3 py-8"
      role="status"
      aria-label={label}
      aria-busy="true"
    >
      {svg}
      {label ? (
        <p className="text-sm text-on-card-muted" aria-hidden="true">
          {label}
        </p>
      ) : null}
    </div>
  );
}
