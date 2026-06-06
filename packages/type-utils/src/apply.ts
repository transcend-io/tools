import { createEnum } from './enum.js';
import { getKeys } from './getKeys.js';
import type { ObjByString, StringKeys } from './types.js';

/**
 * Apply a function to each value of an object while preserving the key types.
 */
export function apply<TInput extends ObjByString, TOutput>(
  obj: TInput,
  applyFunc: (
    value: TInput[keyof TInput],
    key: StringKeys<TInput>,
    fullObj: typeof obj,
    index: number,
  ) => TOutput,
): { [key in keyof TInput]: TOutput } {
  const result = Object.keys(obj).reduce(
    (accumulator, key, index) =>
      Object.assign(accumulator, {
        [key]: applyFunc(obj[key], key as StringKeys<TInput>, obj, index),
      }),
    {},
  );

  return result as { [key in keyof TInput]: TOutput };
}

/**
 * Async version of `apply`.
 */
export async function asyncApply<TInput extends ObjByString, TOutput>(
  obj: TInput,
  applyFunc: (
    value: TInput[keyof TInput],
    key: StringKeys<TInput>,
    fullObj: typeof obj,
    index: number,
  ) => Promise<TOutput>,
): Promise<{ [key in keyof TInput]: TOutput }> {
  const entries = await Promise.all(
    getKeys(obj).map(async (key, index) => ({
      key,
      value: await applyFunc(obj[key], key as StringKeys<TInput>, obj, index),
    })),
  );

  const result = entries.reduce(
    (accumulator, { key, value }) =>
      Object.assign(accumulator, {
        [key]: value,
      }),
    {},
  );

  return result as { [key in keyof TInput]: TOutput };
}

/**
 * Convert a TypeScript enum to a value-to-value map and then call `apply`.
 */
export function applyEnum<TEnum extends string, TOutput>(
  enm: { [key in string]: TEnum },
  applyFunc: (value: TEnum, key: TEnum, fullObj: typeof enm, index: number) => TOutput,
): { [key in TEnum]: TOutput } {
  const obj = createEnum<TEnum, TEnum>(Object.values(enm));
  return apply(obj, applyFunc) as any;
}
