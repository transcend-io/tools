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
 * Contentful fields common between SaaSCategories and Catalogs
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
 * Overload StoredContentfulEntry as a type
 */
export type TcfV2VendorList = t.TypeOf<typeof TcfV2VendorList>;
