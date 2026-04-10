/**
 * `Object.fromEntries` that preserves entry types.
 */
export function fromEntries<const TEntries extends ReadonlyArray<readonly [PropertyKey, unknown]>>(
  entries: TEntries,
): { [K in TEntries[number] as K[0]]: K[1] } {
  return Object.fromEntries(entries) as { [K in TEntries[number] as K[0]]: K[1] };
}
