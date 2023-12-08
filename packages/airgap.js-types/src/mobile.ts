import * as t from 'io-ts';

export const ConsentSDK = t.type({
  /** Unique identifier for the SDK */
  id: t.string,
  /** airgap purposes applicable to this SDK */
  purposes: t.array(t.string),
});

/**
 * Type override
 */
export type ConsentSDK = t.TypeOf<typeof ConsentSDK>;

export const ConsentService = t.intersection([
  t.type({
    name: t.string,
  }),
  t.partial({
    sdks: t.array(ConsentSDK),
  }),
]);

/**
 * Type override
 */
export type ConsentService = t.TypeOf<typeof ConsentService>;

export const MobileConfig = t.type({
  services: t.array(ConsentService),
});

/**
 * Type override
 */
export type MobileConfig = t.TypeOf<typeof MobileConfig>;
