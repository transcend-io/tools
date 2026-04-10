import { function as fpFunction } from 'fp-ts';
import * as t from 'io-ts';

/**
 * A record with optional keys.
 */
export interface DictionaryC<D extends t.Mixed, C extends t.Mixed> extends t.DictionaryType<
  D,
  C,
  {
    [K in t.TypeOf<D>]?: t.TypeOf<C>;
  },
  {
    [K in t.OutputOf<D>]?: t.OutputOf<C>;
  },
  unknown
> {}

/**
 * Helper to encode/decode a record with partial keys.
 */
export const dictionary = <D extends t.Mixed, C extends t.Mixed>(
  keys: D,
  values: C,
  name?: string,
): DictionaryC<D, C> =>
  fpFunction.unsafeCoerce(t.record(t.union([keys, t.undefined]), values, name));
