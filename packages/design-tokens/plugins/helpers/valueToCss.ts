import { ColorSpace, OKLCH, OKLab, sRGB, serialize, type PlainColorObject } from 'colorjs.io/fn';

ColorSpace.register(sRGB);
ColorSpace.register(OKLab);
ColorSpace.register(OKLCH);

interface ColorValue {
  colorSpace: string;
  components: number[];
  alpha?: number;
}

/**
 * Format a DTCG color object as a CSS string using colorjs.io.
 *
 * sRGB values are emitted as hex; other color spaces use their
 * functional notation (e.g. `oklch(L C H)`).
 */
function colorToCss(value: ColorValue): string {
  const { colorSpace: spaceId, components, alpha } = value;

  const color: PlainColorObject = {
    spaceId,
    coords: components as [number, number, number],
    alpha: alpha ?? 1,
  };

  if (spaceId === 'srgb') {
    return serialize(color, { format: 'hex', inGamut: true, collapse: false });
  }

  return serialize(color, { inGamut: true });
}

/** Convert a resolved DTCG value to a CSS string by pattern-matching on shape. */
export function valueToCss(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value
      .map((v: unknown) => {
        if (typeof v === 'string') {
          return v.includes(' ') ? `"${v}"` : v;
        }
        if (typeof v === 'number') {
          return String(v);
        }
        throw new Error(`Unsupported array element in DTCG token value: ${JSON.stringify(v)}`);
      })
      .join(', ');
  }
  if (typeof value === 'object' && value !== null) {
    const v = value as Record<string, unknown>;
    if ('components' in v && 'colorSpace' in v) {
      return colorToCss(v as ColorValue);
    }
    if ('components' in v) {
      return colorToCss({
        colorSpace: 'oklch',
        ...(v as ColorValue),
      });
    }
    if ('value' in v && 'unit' in v) {
      return `${v.value}${v.unit}`;
    }
  }
  throw new Error(`Unsupported DTCG token value: ${JSON.stringify(value)}`);
}
