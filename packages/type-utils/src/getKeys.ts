import type { StringKeys } from './types.js';

/**
 * `Object.keys` for string keys only.
 */
export function getStringKeys<T extends {}>(obj: T): StringKeys<T>[] {
  return Object.keys(obj).filter((key) => typeof key === 'string') as StringKeys<T>[];
}

/**
 * `Object.keys` that preserves key types.
 */
export function getKeys<T extends {}>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[];
}
