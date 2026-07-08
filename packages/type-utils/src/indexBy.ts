/**
 * A typed version of lodash's `keyBy`.
 */
export function indexBy<TItem, TKey extends PropertyKey>(
  iterable: TItem[],
  getKey: (item: TItem) => TKey,
): Record<TKey, TItem> {
  const result = {} as Record<TKey, TItem>;
  for (const item of iterable) {
    result[getKey(item)] = item;
  }
  return result;
}
