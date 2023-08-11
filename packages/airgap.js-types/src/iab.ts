import * as t from 'io-ts';

/**
 * TCF purpose configuration
 */
export const TcfPurpose = t.type({
  id: t.number,
  name: t.string,
  description: t.string,
  descriptionLegal: t.string,
});

/**
 * Type override
 */
export type TcfPurpose = t.TypeOf<typeof TcfPurpose>;

/**
 * TCF stack configuration
 */
export const TcfStack = t.type({
  id: t.number,
  purposes: t.array(t.number),
  specialFeatures: t.array(t.number),
  name: t.string,
  description: t.string,
});

/**
 * Type override
 */
export type TcfStack = t.TypeOf<typeof TcfStack>;

/**
 * TCF stack configuration
 */
export const TcfVendor = t.intersection([
  t.type({
    id: t.number,
    name: t.string,
    purposes: t.array(t.number),
    legIntPurposes: t.array(t.number),
    flexiblePurposes: t.array(t.number),
    specialPurposes: t.array(t.number),
    features: t.array(t.number),
    specialFeatures: t.array(t.number),
    policyUrl: t.string,
    cookieMaxAgeSeconds: t.union([t.number, t.null]),
    usesCookies: t.boolean,
  }),
  t.partial({
    deletedDate: t.string,
    overflow: t.type({
      httpGetLimit: t.number,
    }),
    cookieRefresh: t.boolean,
    usesNonCookieAccess: t.boolean,
    deviceStorageDisclosureUrl: t.string,
  }),
]);

/**
 * Type override
 */
export type TcfVendor = t.TypeOf<typeof TcfVendor>;

export const TcfVendorListVersion = t.type({
  gvlSpecificationVersion: t.number,
  vendorListVersion: t.number, // incremented with each published file change
  tcfPolicyVersion: t.number,
  lastUpdated: t.string,
});
/**
 * Type override
 */
export type TcfVendorListVersion = t.TypeOf<typeof TcfVendorListVersion>;

/**
 * TCF global vendor list version 2
 */
export const TcfV2VendorList = t.intersection([
  TcfVendorListVersion,
  t.type({
    purposes: t.record(t.string, TcfPurpose),
    specialPurposes: t.record(t.string, TcfPurpose),
    features: t.record(t.string, TcfPurpose),
    specialFeatures: t.record(t.string, TcfPurpose),
    stacks: t.record(t.string, TcfStack),
    vendors: t.record(t.string, TcfVendor),
  }),
]);

/**
 * Overload TcfV2VendorList as a type
 */
export type TcfV2VendorList = t.TypeOf<typeof TcfV2VendorList>;

/**
 * TCF GVL v3 purpose configuration
 */
export const TcfGvlV3Purpose = t.type({
  id: t.number,
  name: t.string,
  description: t.string,
  illustrations: t.array(t.string),
});

/**
 * Type override
 */
export type TcfGvlV3Purpose = t.TypeOf<typeof TcfGvlV3Purpose>;

/**
 * TCF GVL v3 data categories configuration
 */
export const TcfGvlV3DataCategory = t.type({
  id: t.number,
  name: t.string,
  description: t.string,
});

/**
 * Type override
 */
export type TcfGvlV3DataCategory = t.TypeOf<typeof TcfGvlV3DataCategory>;

/**
 * TCF GVL v3 stack configuration
 */
export const TcfGvlV3Vendor = t.intersection([
  t.type({
    id: t.number,
    name: t.string,
    purposes: t.array(t.number),
    legIntPurposes: t.array(t.number),
    flexiblePurposes: t.array(t.number),
    specialPurposes: t.array(t.number),
    features: t.array(t.number),
    specialFeatures: t.array(t.number),
    cookieMaxAgeSeconds: t.union([t.number, t.null]),
    usesCookies: t.boolean,
    cookieRefresh: t.boolean,
    usesNonCookieAccess: t.boolean,
    dataRetention: t.intersection([
      t.type({
        purposes: t.record(t.string, t.number),
        specialPurposes: t.record(t.string, t.number),
      }),
      t.partial({
        stdRetention: t.number,
      }),
    ]),
    urls: t.array(
      t.intersection([
        t.type({ langId: t.string, privacy: t.string }),
        t.partial({
          legIntClaim: t.string,
        }),
      ]),
    ),
    deviceStorageDisclosureUrl: t.string,
  }),
  t.partial({
    deletedDate: t.string,
    overflow: t.type({
      httpGetLimit: t.number,
    }),
    dataDeclaration: t.array(t.number),
  }),
]);

/**
 * Type override
 */
export type TcfGvlV3Vendor = t.TypeOf<typeof TcfGvlV3Vendor>;

/**
 * TCF global vendor list version 3
 */
export const TcfV3VendorList = t.intersection([
  TcfVendorListVersion,
  t.type({
    purposes: t.record(t.string, TcfGvlV3Purpose),
    specialPurposes: t.record(t.string, TcfGvlV3Purpose),
    features: t.record(t.string, TcfGvlV3Purpose),
    specialFeatures: t.record(t.string, TcfGvlV3Purpose),
    stacks: t.record(t.string, TcfStack),
    dataCategories: t.record(t.string, TcfGvlV3DataCategory),
    vendors: t.record(t.string, TcfGvlV3Vendor),
  }),
]);

/**
 * Type override
 */
export type TcfV3VendorList = t.TypeOf<typeof TcfV3VendorList>;
