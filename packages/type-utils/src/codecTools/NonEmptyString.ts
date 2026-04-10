import * as t from 'io-ts';

/**
 * Brand for non-empty strings.
 */
type NonEmptyStringBrand = {
  /** Unique symbol to ensure uniqueness of this type across modules/packages. */
  readonly NonEmptyString: symbol;
};

/**
 * Codec for non-empty trimmed strings.
 */
export const NonEmptyString = t.brand(
  t.string,
  (value): value is t.Branded<string, NonEmptyStringBrand> => value.trim().length !== 0,
  'NonEmptyString',
);

/**
 * Branded non-empty string type.
 */
export type NonEmptyString = t.TypeOf<typeof NonEmptyString>;
