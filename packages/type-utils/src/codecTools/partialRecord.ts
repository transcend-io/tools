import * as t from 'io-ts';

/**
 * Like `t.record`, but where the keys are all optional to include.
 */
export interface PartialRecordC<D extends t.Mixed, C extends t.Mixed> extends t.DictionaryType<
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
 * Create an `io-ts` compatible partial record.
 */
export const partialRecord = <D extends t.Mixed, C extends t.Mixed>(
  domain: D,
  codomain: C,
  name?: string,
): PartialRecordC<D, C> =>
  t.record(t.union([domain, t.undefined]), codomain, name) as unknown as PartialRecordC<D, C>;
