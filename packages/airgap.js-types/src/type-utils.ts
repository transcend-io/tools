// external
import * as t from 'io-ts';

/**
 * To make the inspected type more tractable than a bunch of intersections
 */
 export type Identity<T> = {
    [K in keyof T]: T[K];
  };

/**
 * Make selected object keys defined by K optional in type T
 */
 export type Optionalize<T, K extends keyof T> = Identity<
 Omit<T, K> & Partial<T>
>;

/**
 * An arbitrary object keyed by strings for naming consistency
 */
 export type ObjByString = { [key in string]: any }; // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * Object.entries that actually preserves entries as types.
 *
 * @param o - The object to get the entries from
 * @returns The entries of the object preserving type
 */
 export default function getEntries<
 TKey extends keyof TObj,
 TObj extends ObjByString,
>(o: TObj): [TKey, TObj[TKey]][] {
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 return Object.entries(o) as any;
}


/**
 * Invert an object so that the values look up the keys.
 * If the object has an array as the value, each item in the array will be inverted.
 *
 * @param obj - The object to invert
 * @param throwOnDuplicate - When true, throw error if duplicate key detected
 * @returns The inverted object
 */
 export function invert<TKey extends string, TValue extends string | string[]>(
  obj: { [key in TKey]?: TValue },
  throwOnDuplicate = true,
): {
  [key in TValue extends (infer TK)[] ? TK : TValue]: TValue extends any[]
    ? TKey[]
    : TKey;
} {
  const result: any = {} as any;

  // Invert
  getEntries(obj).forEach(([key, instance]: [TKey, TValue | undefined]) => {
    // Ensure no undefined values
    if (instance === undefined) {
      throw new Error('inverse found undefined value, this is not supported');
    }

    // Handle array case
    if (Array.isArray(instance)) {
      instance.forEach((listKey) => {
        // Create a new entry
        if (!result[listKey]) {
          result[listKey] = [key];
        } else {
          // Add to existing
          result[listKey].push(key);
        }
      });
    } else {
      // Ensure we do not overwrite duplicates
      if (result[instance] && throwOnDuplicate) {
        throw new Error(
          `Encountered duplicate value inverting object: "${instance}: ${key} and ${result[instance]}"`,
        );
      }
      result[instance] = key;
    }
  });
  return result;
}

/**
 * We care about the values of an enum. This does not come out of the box with io-ts so we have to invert the enum first.
 *
 * @param enm - The enum to invert
 * @returns The io-ts keyof
 */
 export function valuesOf<TEnum extends string>(
  enm: { [k in string]: TEnum },
): t.KeyofC<{ [k in TEnum]: unknown }> {
  return t.keyof(invert(enm) as any);
}

/**
 * Make an enum compatible with types -- in separate file because Logger/enums and Enum/index circular dependency
 *
 * @param x - The enum
 * @returns The object proxy with error logger when a value is accessed outside of enum
 */
 export function makeEnum<
 T extends { [index: string]: U | U[] },
 U extends string,
>(x: T): T {
 return x;
}