export { ISO_31661 } from './iso3166-1.js';
import { ISO_31661 } from './iso3166-1.js';

/**
 * Build a typed dictionary whose keys and values match.
 *
 * @param source - Lookup object whose keys become enum members
 * @returns Enum object with identical keys and values
 */
function getDictFromKeys<T extends object>(
  source: T,
): {
  [K in keyof T]: K;
} {
  return Object.fromEntries(Object.keys(source).map((code) => [code, code])) as {
    [K in keyof T]: K;
  };
}

/**
 * ISO 3166-1 alpha-2 country codes (and EU).
 *
 * @see https://github.com/umpirsky/country-list/blob/master/data/en/country.json
 */
export const IsoCountryCode: {
  readonly [K in keyof typeof ISO_31661]: K;
} = getDictFromKeys(ISO_31661);

/** Type override */
export type IsoCountryCode = (typeof IsoCountryCode)[keyof typeof IsoCountryCode];
