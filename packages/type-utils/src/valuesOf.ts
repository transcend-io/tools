import * as t from 'io-ts';

import { invert } from './invert.js';

/**
 * Build an `io-ts` codec over the values of an enum-like object.
 */
export function valuesOf<TEnum extends string>(enm: {
  [key in string]: TEnum;
}): t.KeyofC<{ [key in TEnum]: unknown }> {
  return t.keyof(invert(enm) as any);
}
