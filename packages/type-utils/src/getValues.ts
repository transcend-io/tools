/**
 * `Object.values` that preserves value types.
 */
export function getValues<TValue>(obj: {
  [key in string | number | symbol]: TValue;
}): TValue[] {
  return Object.values(obj) as TValue[];
}
