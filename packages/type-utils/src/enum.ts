import type { ObjByString } from './types.js';

// TODO: https://linear.app/transcend/issue/LAK-2351 – Remove deprecated enum utils

/**
 * An enumerated value.
 * @deprecated - Enum utils are deprecated
 */
export type Enumerate<T = string, TKey extends string = string> = {
  [key in TKey]: T;
};

/**
 * A TypeScript enum with string values.
 * @deprecated - Enum utils are deprecated
 */
export type TypescriptEnum = { [key in string]: string } | { [key in number]: string };

/**
 * An input when defining an enum can be an object of string -> string or a list
 * of strings.
 * @deprecated - Enum utils are deprecated
 */
export type EnumInput<T, TKey extends string = string> = Enumerate<T, TKey> | string[];

/**
 * Convert a list of strings to an enum-like object.
 * @deprecated - Enum utils are deprecated
 */
export function listToEnum(attributes: string[]): Enumerate<string> {
  const initialValue: Enumerate<string> = {};
  return attributes.reduce((accumulator, value) => {
    accumulator[value] = value;
    return accumulator;
  }, initialValue);
}

/**
 * Merge enum-like inputs into a single enum object.
 * @deprecated - Enum utils are deprecated
 */
export function createEnum<T = string, TKey extends string = string>(
  ...attributes: EnumInput<T, TKey>[]
): Enumerate<T, TKey> {
  const objectAttributes = attributes.map((attribute) =>
    Array.isArray(attribute) ? listToEnum(attribute) : attribute,
  );

  return Object.assign({}, ...objectAttributes);
}

/**
 * Filter an enum and return the keys that remain.
 * @deprecated - Enum utils are deprecated
 */
export function filterEnum<T extends ObjByString>(
  obj: T,
  filterFunc: (value: T[keyof T], key: keyof T, calculatedEnum: Enumerate<T[keyof T]>) => boolean,
): (keyof T)[] {
  return (Object.keys(obj) as (keyof T)[])
    .filter((key) => filterFunc(obj[key], key, obj))
    .map((key) => key);
}

/**
 * Make an enum compatible with type inference without changing its runtime
 * shape.
 * @deprecated – Enum utils are deprecated
 */
export function makeEnum<T extends { [index: string]: Value | Value[] }, Value extends string>(
  value: T,
): T {
  return value;
}
