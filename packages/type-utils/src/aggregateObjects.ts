/**
 * Aggregates multiple objects into a single object by combining values of
 * matching keys into comma-separated strings.
 */
export const aggregateObjects = ({
  objs,
  wrap = false,
}: {
  /** The objects to aggregate in a single one. */
  objs: any[];
  /** Whether to wrap the concatenated values in `[]`. */
  wrap?: boolean;
}): any => {
  const allKeys = Array.from(
    new Set(objs.flatMap((obj) => (obj && typeof obj === 'object' ? Object.keys(obj) : []))),
  );

  return allKeys.reduce(
    (accumulator, key) => {
      const values = objs
        .map((obj) => (wrap ? `[${obj?.[key] ?? ''}]` : (obj?.[key] ?? '')))
        .join(',');
      accumulator[key] = values;
      return accumulator;
    },
    {} as Record<string, any>,
  );
};
