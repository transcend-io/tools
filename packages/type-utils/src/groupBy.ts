/**
 * A typed version of lodash's `groupBy`.
 */
export function groupBy<TItem, TKey>(
  iterable: TItem[],
  getKey: (item: TItem) => TKey,
): Map<TKey, TItem[]> {
  return iterable.reduce((groupedItems, item) => {
    const groupedKey = getKey(item);
    return groupedItems.set(groupedKey, [...(groupedItems.get(groupedKey) ?? []), item]);
  }, new Map<TKey, TItem[]>());
}
