import * as t from 'io-ts';

/**
 * Brand for arrays with bounded length.
 */
export interface FixedLengthArrayBrand<T> extends Array<T> {
  /** Unique symbol to ensure uniqueness of this type across modules/packages. */
  readonly fixedLengthArray: unique symbol;
  /** The minimum length of the array. */
  readonly min: number;
  /** The maximum length of the array. */
  readonly max: number;
}

/**
 * Codec for arrays constrained to a fixed length range.
 */
export const FixedLengthArray = <C extends t.Mixed>(
  min: number,
  max: number,
  codec: C,
): t.BrandC<t.ArrayC<C>, FixedLengthArrayBrand<C>> =>
  t.brand(
    t.array(codec),
    (value: Array<C>): value is t.Branded<Array<C>, FixedLengthArrayBrand<C>> =>
      min <= value.length && value.length <= max,
    'fixedLengthArray',
  );

/**
 * Branded fixed-length array type.
 */
export type FixedLengthArray<C extends t.Mixed> = t.TypeOf<
  t.BrandC<t.ArrayC<C>, FixedLengthArrayBrand<C>>
>;
