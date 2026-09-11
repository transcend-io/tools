import type { CSSProperties } from 'react';

/** Overall speed multiplier (higher = faster). */
const SPEED = 1.4;

/** Per-segment trim duration range, in seconds. */
const TRIM_DURATION_MIN_S = 2.55 / SPEED;
const TRIM_DURATION_MAX_S = 4.4 / SPEED;

/** Random delay spread across segments — organic without losing the logo beat. */
const TRIM_DELAY_SPREAD_S = 0.48 / SPEED;

/** Timing function for the outer and middle trim crawl. */
const TRIM_EASE = 'cubic-bezier(0.11, 0.41, 0.97, 0.55)';

/** Inner ring spin period once the fill completes, in seconds. */
const INNER_DURATION_S = 2.4 / SPEED;
const SMALL_INNER_DURATION_S = 1.5 / SPEED;

/** One-shot fill before the inner ring starts spinning, in seconds. */
const INNER_FILL_DURATION_S = 0.7 / SPEED;
const SMALL_INNER_FILL_DURATION_S = 0.35 / SPEED;

/** Resting arc gap after the fill, as a fraction of path length. */
const INNER_GAP = 0.38;

/** Seed tip so the head is visible at fill start; round caps need length. */
const INNER_FILL_TIP = 0.02;

/** Logomark viewBox center (from the 37x37 logomark). */
export const CX = 18.5;
export const CY = 18.5;

/** Ring geometry approximated from the filled-arc logomark. */
export const INNER_R = 7.3;
const MIDDLE_R = 12.2;
const OUTER_R = 17.1;
export const STROKE_WIDTH = 2.5;

/** Heavier stroke so the small spinner reads at button sizes. */
export const SMALL_STROKE_WIDTH = 4;

/** Display size in CSS pixels, per variant. */
export const DEFAULT_SIZE_PX = 55;
export const SMALL_SIZE_PX = 20;

export const FULL_VIEWBOX = '0 0 37 37';

/** Cropped viewBox around the inner ring so the small spinner fills its box. */
const SMALL_VIEWBOX_PAD = INNER_R + SMALL_STROKE_WIDTH / 2 + 1;
export const SMALL_VIEWBOX = `${CX - SMALL_VIEWBOX_PAD} ${CY - SMALL_VIEWBOX_PAD} ${SMALL_VIEWBOX_PAD * 2} ${SMALL_VIEWBOX_PAD * 2}`;

/**
 * Point on a circle, with 0 degrees at 12 o'clock and increasing clockwise.
 *
 * @param radius - Circle radius
 * @param angleDeg - Angle in degrees
 * @returns Coordinates in viewBox units
 */
function polar(radius: number, angleDeg: number): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) };
}

/**
 * Clockwise arc path between two angles.
 *
 * @param radius - Arc radius
 * @param startDeg - Start angle in degrees
 * @param endDeg - End angle in degrees
 * @returns An SVG path `d` attribute
 */
function arcPath(radius: number, startDeg: number, endDeg: number): string {
  const start = polar(radius, startDeg);
  const end = polar(radius, endDeg);
  const delta = (((endDeg - startDeg) % 360) + 360) % 360;
  const largeArc = delta > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

/**
 * Evenly spaced dashes around one ring.
 *
 * @param radius - Ring radius
 * @param count - Number of dashes
 * @param dashDegrees - Angular length of each dash
 * @returns Path `d` attributes in clockwise order
 */
function buildSegments(radius: number, count: number, dashDegrees: number): string[] {
  const period = 360 / count;
  return Array.from({ length: count }, (_, index) =>
    arcPath(radius, index * period, index * period + dashDegrees),
  );
}

export const MIDDLE_SEGMENTS = buildSegments(MIDDLE_R, 5, 52);
export const OUTER_SEGMENTS = buildSegments(OUTER_R, 10, 22);

/**
 * Deterministic 0–1 hash, so timings are stable across renders but do not
 * march clockwise around the rings.
 *
 * @param seed - Seed value
 * @returns A value in [0, 1)
 */
function unitNoise(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Pseudo-random delay and duration for one trim segment.
 *
 * @param ringSeed - Seed distinguishing the middle and outer rings
 * @param index - Segment index within the ring
 * @returns Inline animation timing for that segment
 */
export function segmentTiming(ringSeed: number, index: number): CSSProperties {
  const delay = unitNoise(ringSeed * 17.13 + index * 91.7) * TRIM_DELAY_SPREAD_S;
  const duration =
    TRIM_DURATION_MIN_S +
    unitNoise(ringSeed * 23.71 + index * 53.9) * (TRIM_DURATION_MAX_S - TRIM_DURATION_MIN_S);
  return { animationDelay: `${delay}s`, animationDuration: `${duration}s` };
}

/**
 * SVG dimensions and animation values consumed by `spinner.css`.
 *
 * Passing the dash arrays as whole custom-property values keeps the motion
 * constants in TypeScript while letting Vite ship the keyframes as real CSS.
 */
export function spinnerStyle(isSmall: boolean, pixels: number): CSSProperties {
  return {
    width: `${pixels}px`,
    height: `${pixels}px`,
    '--transcend-logo-spinner-trim-duration': `${(TRIM_DURATION_MIN_S + TRIM_DURATION_MAX_S) / 2}s`,
    '--transcend-logo-spinner-trim-ease': TRIM_EASE,
    '--transcend-logo-spinner-inner-duration': `${isSmall ? SMALL_INNER_DURATION_S : INNER_DURATION_S}s`,
    '--transcend-logo-spinner-fill-duration': `${isSmall ? SMALL_INNER_FILL_DURATION_S : INNER_FILL_DURATION_S}s`,
    '--transcend-logo-spinner-inner-tip': `${INNER_FILL_TIP} ${1 - INNER_FILL_TIP}`,
    '--transcend-logo-spinner-inner-rest': `${1 - INNER_GAP} ${INNER_GAP}`,
  } as CSSProperties;
}
