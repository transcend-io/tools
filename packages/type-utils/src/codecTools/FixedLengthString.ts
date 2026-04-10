import * as t from 'io-ts';

/**
 * Brand for strings of fixed length.
 */
export type FixedLengthStringBrand<N extends number> = {
  /** The expected length of the string. */
  readonly length: N;
  /** Unique symbol to ensure uniqueness of this type across modules/packages. */
  readonly FixedLengthString: unique symbol;
};

/**
 * Codec for strings constrained to a fixed length.
 */
export const FixedLengthString = <N extends number>(
  len: N,
): t.BrandC<t.StringC, FixedLengthStringBrand<N>> =>
  t.brand(
    t.string,
    (value): value is t.Branded<string, FixedLengthStringBrand<N>> => value.length === len,
    'FixedLengthString',
  );

/**
 * Branded fixed-length string type.
 */
export type FixedLengthString<N extends number> = t.TypeOf<
  t.BrandC<t.StringC, FixedLengthStringBrand<N>>
>;
