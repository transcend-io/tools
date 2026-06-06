import type { ObjByString } from './types.js';

/**
 * `Object.entries` that preserves entry types.
 */
export function getEntries<TKey extends keyof TObj, TObj extends ObjByString>(
  obj: TObj,
): [TKey, TObj[TKey]][] {
  return Object.entries(obj) as any;
}
