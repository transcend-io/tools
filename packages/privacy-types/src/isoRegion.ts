import { IsoCountryCode } from '@transcend-io/internationalization';
import { valuesOf } from '@transcend-io/type-utils';

import { ISO_31662 } from './isoConstants/iso3166-2.js';

export { IsoCountryCode };

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
