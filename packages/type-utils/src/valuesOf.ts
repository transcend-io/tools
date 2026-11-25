import * as t from 'io-ts';

import { invert } from './invert.js';

/**
 * Build an `io-ts` codec over the values of an enum-like object.
 *
 * @param enm - Enum-like object
 * @param name - Optional stable codec name
 * @returns Codec accepting the enum values
 */
export function valuesOf<TEnum extends string>(
  enm: {
    [key in string]: TEnum;
  },
  name?: string,
): t.KeyofC<{ [key in TEnum]: unknown }> {
  return t.keyof(invert(enm) as any, name);
}
