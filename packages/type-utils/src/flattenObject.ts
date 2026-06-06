import { aggregateObjects } from './aggregateObjects.js';

/**
 * Flattens a nested object into a single-level object with concatenated key
 * names.
 */
export const flattenObject = ({
  obj,
  prefix = '',
}: {
  /** The object to flatten. */
  obj: any;
  /** The prefix to prepend to keys while recursing. */
  prefix?: string;
}): any =>
  !obj
    ? {}
    : Object.keys(obj ?? []).reduce(
        (accumulator, key) => {
          const newKey = prefix ? `${prefix}_${key}` : key;
          const entry = obj[key];

          if (
            Array.isArray(entry) &&
            entry.length > 0 &&
            entry.some((item) => typeof item === 'object' && item !== null)
          ) {
            const objectEntries = entry.filter((item) => typeof item === 'object' && item !== null);
            const flattenedObjects = objectEntries.map((item) => flattenObject({ obj: item }));
            const aggregated = aggregateObjects({ objs: flattenedObjects });
            Object.entries(aggregated).forEach(([aggregatedKey, value]) => {
              accumulator[`${newKey}_${aggregatedKey}`] = value;
            });
          } else if (typeof entry === 'object' && entry !== null && !Array.isArray(entry)) {
            Object.assign(accumulator, flattenObject({ obj: entry, prefix: newKey }));
          } else {
            accumulator[newKey] = Array.isArray(entry)
              ? entry
                  .map((item) => {
                    if (typeof item === 'string') {
                      return item.replaceAll(',', '');
                    }

                    return item ?? '';
                  })
                  .join(',')
              : typeof entry === 'string'
                ? entry.replaceAll(',', '')
                : (entry ?? '');
          }

          return accumulator;
        },
        {} as Record<string, any>,
      );
