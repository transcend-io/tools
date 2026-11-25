import { valuesOf } from '@transcend-io/type-utils';
import * as t from 'io-ts';

import { BrowserLanguage } from './browserLanguage.js';
import { BrowserTimeZone } from './browserTimeZones.js';
import { OnConsentExpiry } from './consentExpiry.js';
import {
  ConsentBundleType,
  ConsentPrecedenceOption,
  RegionsOperator,
  SignedIabAgreementOption,
  TelemetryPartitionStrategy,
  UnknownRequestPolicy,
} from './consentManager.js';
import { ConsentThemeInput, ConsentVariantInput } from './consentUiInventory.js';
import { IsoCountryCodeCodec, IsoCountrySubdivisionCodeCodec } from './isoRegion.js';
import { PrefixModuleCatalogCodec, PrefixModuleConfig } from './prefixModule.js';
import { InitialViewState } from './viewState.js';

const UnknownRequestPolicyCodec = valuesOf(UnknownRequestPolicy, 'UnknownRequestPolicy');

export const WebhookHeader = t.intersection([
  t.type({
    /** The name of the header to set. */
    name: t.string,
    /** The value of the header. */
    value: t.string,
  }),
  t.partial({
    /**
     * When true, the header value is write-only in inventory pull/preview and
     * should be supplied via `<<parameters.NAME>>` at push time.
     */
    isSecret: t.boolean,
  }),
]);

/** Type override */
export type WebhookHeader = t.TypeOf<typeof WebhookHeader>;

export const RegionInput = t.partial({
  /** The country */
  country: IsoCountryCodeCodec,
  /** The country subdivision */
  countrySubDivision: IsoCountrySubdivisionCodeCodec,
});

/** Type override */
export type RegionInput = t.TypeOf<typeof RegionInput>;

export const ConsentManageExperienceInput = t.intersection([
  t.type({
    /** Name of experience */
    name: t.string,
  }),
  t.partial({
    /** Name of experience */
    displayName: t.string,
    /** Region that define this regional experience */
    regions: t.array(RegionInput),
    /** How to handle consent expiry */
    onConsentExpiry: valuesOf(OnConsentExpiry),
    /** Consent expiration lever */
    consentExpiry: t.number,
    /** In vs not in operator */
    operator: valuesOf(RegionsOperator),
    /** Priority of experience */
    displayPriority: t.number,
    /** View state to prompt when auto prompting is enabled */
    viewState: valuesOf(InitialViewState),
    /** Purposes that can be opted out of in a particular experience */
    purposes: t.array(
      t.type({
        /** Slug of purpose */
        trackingType: t.string,
      }),
    ),
    /** Purposes that are opted out by default in a particular experience */
    optedOutPurposes: t.array(
      t.type({
        /** Slug of purpose */
        trackingType: t.string,
      }),
    ),
    /**
     * Browser languages that define this regional experience
     */
    browserLanguages: t.array(valuesOf(BrowserLanguage)),
    /** Browser time zones that define this regional experience */
    browserTimeZones: t.array(valuesOf(BrowserTimeZone)),
    /** ID of the consent UI variant assigned to this experience */
    consentUiVariantSlug: t.string,
  }),
]);

/** Type override */
export type ConsentManageExperienceInput = t.TypeOf<typeof ConsentManageExperienceInput>;

/** Prefix module attached to the consent manager. Pull only: push ignores it */
export const ConsentManagerPrefixModuleInput = t.intersection([
  t.type({
    /** Name of the module */
    name: t.string,
    /** Catalog the module comes from */
    catalog: PrefixModuleCatalogCodec,
    /** Version of the module */
    version: t.string,
  }),
  t.partial({
    /** String config values for the module on this bundle */
    config: PrefixModuleConfig,
  }),
]);

/** Type override */
export type ConsentManagerPrefixModuleInput = t.TypeOf<typeof ConsentManagerPrefixModuleInput>;

export const ConsentManagerInput = t.partial({
  /** Airgap version */
  version: t.string,
  /** The consent manager domains in the instance */
  bundleUrls: t.record(valuesOf(ConsentBundleType), t.string),
  /** The consent manager domains in the instance */
  domains: t.array(t.string),
  /** Key used to partition consent records */
  partition: t.string,
  /** Precedence of signals vs user input */
  consentPrecedence: valuesOf(ConsentPrecedenceOption),
  /** The consent manager unknown request policy */
  unknownRequestPolicy: UnknownRequestPolicyCodec,
  /** The consent manager unknown cookie policy */
  unknownCookiePolicy: UnknownRequestPolicyCodec,
  /** The XDI sync endpoint for this airgap bundle */
  syncEndpoint: t.string,
  /** The telemetry partitioning strategy */
  telemetryPartitioning: valuesOf(TelemetryPartitionStrategy),
  /** Whether the site owner has signed the IAB agreement */
  signedIabAgreement: valuesOf(SignedIabAgreementOption),
  /** Regional experience configurations */
  experiences: t.array(ConsentManageExperienceInput),
  /** Theme config */
  theme: t.partial({
    /** Primary color */
    primaryColor: t.string,
    /** Font color */
    fontColor: t.string,
    /** Privacy policy URL */
    privacyPolicy: t.string,
    /** Auto-prompt setting */
    prompt: t.number,
  }),
  // TODO: https://transcend.height.app/T-23919 - reconsider simpler yml shape
  /** The Shared XDI host sync groups config (JSON) for this airgap bundle */
  syncGroups: t.string,
  consentVariants: t.array(ConsentVariantInput),
  consentThemes: t.array(ConsentThemeInput),
  /** Prefix modules on the bundle. Pull only, push ignores it (no public API to write them) */
  prefixModules: t.array(ConsentManagerPrefixModuleInput),
  /**
   * Deployment webhook URL called when consent bundles are published.
   *
   * @example `webhookUrl: https://example.<<parameters.domain>>/consent-deploy`
   */
  webhookUrl: t.string,
  /**
   * Custom headers for the deployment webhook. Use `<<parameters.NAME>>` for
   * secret values and set `isSecret: true` so push preview does not log them.
   *
   * @example
   * `- name: x-transcend-token`
   * `  value: <<parameters.CONSENT_DEPLOY_TOKEN>>`
   * `  isSecret: true`
   */
  webhookHeaders: t.array(WebhookHeader),
  /**
   * When true, traffic is report-only (enforcement off).
   * Deploy the bundle after push for the live /cm bundle to change.
   */
  reportOnly: t.boolean,
});

/** Type override */
export type ConsentManagerInput = t.TypeOf<typeof ConsentManagerInput>;
