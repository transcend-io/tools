import { getEntries } from './getEntries.js';

/**
 * Invert an object so the values look up the keys. Arrays are expanded and map
 * back to arrays of keys.
 */
export function invert<TKey extends string, TValue extends string | string[]>(
  obj: { [key in TKey]?: TValue },
  throwOnDuplicate = true,
): {
  [key in TValue extends (infer Item)[] ? Item : TValue]: TValue extends any[] ? TKey[] : TKey;
} {
  const result: any = {};

  getEntries(obj).forEach(([key, instance]: [TKey, TValue | undefined]) => {
    if (instance === undefined) {
      throw new Error('inverse found undefined value, this is not supported');
    }

    if (Array.isArray(instance)) {
      instance.forEach((listKey) => {
        if (!result[listKey]) {
          result[listKey] = [key];
        } else {
          result[listKey].push(key);
        }
      });
      return;
    }

    if (result[instance] && throwOnDuplicate) {
      throw new Error(
        `Encountered duplicate value inverting object: "${instance}: ${key} and ${result[instance]}"`,
      );
    }

    result[instance] = key;
  });

  return result;
}

/**
 * Safely invert an object into `{ [value]: key[] }`.
 */
export function invertSafe<TKey extends string, TValue extends string>(obj: {
  [key in TKey]: TValue | TValue[];
}): {
  [key in TValue]: TKey[];
} {
  const result: any = {};

  getEntries(obj).forEach(([key, instance]) => {
    if (instance === undefined) {
      throw new Error('inverse found undefined value, this is not supported');
    }

    if (Array.isArray(instance)) {
      instance.forEach((listKey) => {
        if (!result[listKey]) {
          result[listKey] = [key];
        } else {
          result[listKey].push(key);
        }
      });
      return;
    }

    if (!result[instance]) {
      result[instance] = [key];
      return;
    }

    result[instance].push(key);
  });

  return result;
}
