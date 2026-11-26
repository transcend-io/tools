import { makeEnum, valuesOf } from '@transcend-io/type-utils';

import { ISO_31661 } from './isoConstants/iso3166-1.js';
import { ISO_31662 } from './isoConstants/iso3166-2.js';

/**
 * gets a typed Dictionary (identical key/values) from a source lookup object
 *
 * @param source - the source lookup
 * @returns the typed dictionary
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
 * Country Code taken from https://github.com/umpirsky/country-list/blob/master/data/en/country.json
 */
export const IsoCountryCode = getDictFromKeys(ISO_31661);

/** Type override */
export type IsoCountryCode = (typeof IsoCountryCode)[keyof typeof IsoCountryCode];

/**
 * Country subdivisions taken from taken from https://github.com/wooorm/iso-3166/blob/main/2.js
 */
export const IsoCountrySubdivisionCode = getDictFromKeys(ISO_31662);

/** Type override */
export type IsoCountrySubdivisionCode =
  (typeof IsoCountrySubdivisionCode)[keyof typeof IsoCountrySubdivisionCode];

/** io-ts codec for {@link IsoCountryCode}, shared so JSON schema output can reference it once */
export const IsoCountryCodeCodec = valuesOf(IsoCountryCode, 'IsoCountryCode');

/** io-ts codec for {@link IsoCountrySubdivisionCode}, shared so JSON schema output can reference it once */
export const IsoCountrySubdivisionCodeCodec = valuesOf(
  IsoCountrySubdivisionCode,
  'IsoCountrySubdivisionCode',
);
