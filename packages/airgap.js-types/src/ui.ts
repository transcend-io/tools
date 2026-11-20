import type {
  ConsentManagerSupportedTranslationValue,
  LocaleValue,
} from '@transcend-io/internationalization';
import { LoadOptions } from '@transcend-io/privacy-types';
// main
import { applyEnum, type ObjByString, valuesOf } from '@transcend-io/type-utils';
// external
import * as t from 'io-ts';

import { BooleanString, type AirgapAuth, type AirgapAuthMap } from './core.js';
// local
import {
  ViewState,
  InitialTranscendViewState,
  InitialViewState,
  PrivacyRegimeEnum,
  DismissedViewState,
} from './enums/index.js';
import { NonTcfVendor } from './iab.js';

/** Transcend Smart Quarantine API (window.transcend) */
export type PreInitTranscendAPI = {
  /** Ready event subscriber */
  ready(callback: (transcend: TranscendAPI) => void): void;
  /** Ready event dispatch queue */
  readyQueue: ((transcend: TranscendAPI) => void)[];
};

/** showConsentManager() */
export interface ShowConsentManagerOptions {
  /** View state */
  viewState?: ViewState;
}

/**
 * Input for fetching a policy from Transcend and inserting template variables
 */
export type GetTranscendPolicies = {
  /** The language to fetch policy for - defaults to currently selected language key */
  locale?: LocaleValue;
  /** Template variables to dynamically inject into the policy */
  variables?: ObjByString;
  /**
   * The UUID of the policies defined in Transcend to fetch
   *
   * This can be pulled from the URL
   * @see https://app.transcend.io/privacy-center/policies
   */
  policyIds?: string[];
  /**
   * The titles of the policies defined in Transcend to fetch
   *
   * This can be pulled from the URL
   * @see https://app.transcend.io/privacy-center/policies
   */
  policyTitles?: string[];
};

/**
 * The returning Transcend policy
 */
export type TranscendPolicy = {
  /** The policy UUID */
  id: string;
  /** The policy title */
  title: string;
  /** The policy content */
  content: string;
};

/**
 * Transcend Consent Manager external methods
 */
export type ConsentManagerAPI = Readonly<{
  /** Possible ViewState values */
  viewStates: Set<ViewState>;
  /** Expose an option to grab the current view state */
  getViewState: () => ViewState;
  /** Get the current active language */
  getPolicies: (input?: GetTranscendPolicies) => Promise<TranscendPolicy[]>;
  /** Callback that sets any dynamic variables that should be exposed to the consent UI messages */
  setUiVariables: (variables: ObjByString) => Promise<void>;
  /** Get the current value of Transcend UI variables */
  getUiVariables: () => ObjByString;
  /** Set consent change authorization key */
  setAuth?: (key: AirgapAuthMap['key']) => void;
  /** Change the current privacy policy URL */
  setPrivacyPolicy: (privacyPolicyLink: string) => void;
  /** Change the current secondary policy URL */
  setSecondaryPolicy: (privacyPolicyLink: string) => void;
  /** Show consent manager unless recently dismissed */
  autoShowConsentManager(options?: ShowConsentManagerOptions): Promise<void>;
  /** Show consent manager */
  showConsentManager(options?: ShowConsentManagerOptions): Promise<void>;
  /** Set the current active language */
  setActiveLocale(locale: ConsentManagerSupportedTranslationValue): Promise<void>;
  /** Get the currently active locale */
  getActiveLocale: () => ConsentManagerSupportedTranslationValue;
  /** Toggle consent manager */
  toggleConsentManager(options?: ShowConsentManagerOptions): Promise<void>;
  /** Hide consent manager */
  hideConsentManager(): Promise<void>;
  /** Opt out of the sale of personal info & show a disclosure */
  doNotSell(auth: AirgapAuth, options?: ShowConsentManagerOptions): Promise<void>;
  /** Opt out of all purposes */
  optOutNotice(auth: AirgapAuth, options?: ShowConsentManagerOptions): Promise<void>;
  /** Sets local tcf string (does not sync to xdi or preference store) */
  setTCFConsent?: (auth: AirgapAuth, tcString: string) => Promise<void>;
  /** UI version */
  version?: string;
}> &
  EventTarget;

/**
 * `transcend` event types
 */
export type TranscendEventType = 'view-state-change';

/** 'view-state-change' custom event details */
export type ViewStateEventDetails = {
  /** The new, now-current view state */
  viewState: ViewState;
  /** The previous view state */
  previousViewState: ViewState | null;
};

/** Transcend Smart Quarantine API (window.transcend) */
export type TranscendAPI = PreInitTranscendAPI & ConsentManagerAPI;

/**
 * Customer theming
 */
export const ConsentManagerTheme = t.type({
  /** Primary color */
  primaryColor: t.string,
  /** Font color */
  fontColor: t.string,
});

/** Type override */
export type ConsentManagerTheme = t.TypeOf<typeof ConsentManagerTheme>;

/**
 * Mobile-first responsive breakpoints
 * No media query for mobile, which is the default
 */
export const ConsentManagerBreakpoints = t.type({
  /** In px, at or above this width is tablet */
  tablet: t.string,
  /** In px, at or above this width is desktop */
  desktop: t.string,
});

/** Type override */
export type ConsentManagerBreakpoints = t.TypeOf<typeof ConsentManagerBreakpoints>;

/**
 * TODO: https://transcend.height.app/T-19149 - remove
 * @deprecated
 */
export const PrivacyRegimeToInitialViewStateInput = t.partial(
  applyEnum(PrivacyRegimeEnum, () => valuesOf(InitialTranscendViewState)),
);

/**
 * TODO: https://transcend.height.app/T-19149 - remove
 * @deprecated
 */
export type PrivacyRegimeToInitialViewStateInput = t.TypeOf<
  typeof PrivacyRegimeToInitialViewStateInput
>;

/**
 * TODO: https://transcend.height.app/T-19149 - remove
 * @deprecated
 */
export const PrivacyRegimeToInitialViewState = t.record(
  valuesOf(PrivacyRegimeEnum),
  valuesOf(InitialTranscendViewState),
);

/**
 * TODO: https://transcend.height.app/T-19149 - remove
 * @deprecated
 */
export type PrivacyRegimeToInitialViewState = t.TypeOf<typeof PrivacyRegimeToInitialViewState>;

export const ExperienceToInitialViewState = t.record(t.string, valuesOf(InitialViewState));

/** type overload */
export type ExperienceToInitialViewState = t.TypeOf<typeof ExperienceToInitialViewState>;

export const RequiredConsentManagerConfig = t.type({
  /** Customer theming */
  theme: ConsentManagerTheme,
  /** A set of responsive breakpoints */
  breakpoints: ConsentManagerBreakpoints,
  /** The privacy policy URL to redirect to */
  privacyPolicy: t.string,
  /** The secondary policy URL to redirect to */
  secondaryPolicy: t.string,
  /** Custom CSS stylesheet */
  css: t.string,
  /** Path to localizations directory */
  messages: t.string,
  /** What state the consent manager should launch in */
  initialViewStateByPrivacyRegime: ExperienceToInitialViewState,
  /** What state the consent manager should go to when dismissed */
  dismissedViewState: valuesOf(DismissedViewState),
});

/** type overload */
export type RequiredConsentManagerConfig = t.TypeOf<typeof RequiredConsentManagerConfig>;

export const OptionalConsentManagerConfig = t.partial({
  /** The set of enabled languages - CSV of ConsentManagerSupportedTranslationValue */
  languages: t.string,
  /** The override value for the consent banner z-index */
  uiZIndex: t.string,
  /**
   * The override value for the consent banner shadow root state
   *
   * Potential values: 'closed' (default) and 'open'
   */
  uiShadowRoot: t.string,
  /**
   * The override value for whether to focus on the first descendant of the root arg w/data-initialFocus attribute
   * Potential values: `'on'` (default) or `'off'`
   *
   */
  autofocus: BooleanString,
});

/** type overload */
export type OptionalConsentManagerConfig = t.TypeOf<typeof OptionalConsentManagerConfig>;

/** Consent manager UI configuration */
export const ConsentManagerConfig = t.intersection([
  RequiredConsentManagerConfig,
  OptionalConsentManagerConfig,
]);

/** Type override */
export type ConsentManagerConfig = t.TypeOf<typeof ConsentManagerConfig>;

/** Input for Consent manager UI configuration */
export const ConsentManagerConfigInput = t.partial({
  ...OptionalConsentManagerConfig.props,
  ...RequiredConsentManagerConfig.props,
});

/** Type override */
export type ConsentManagerConfigInput = t.TypeOf<typeof ConsentManagerConfigInput>;

export const TCFConfig = t.type({
  /** Path to vendor-list.json */
  vendorList: t.string,
  /** Custom CSS stylesheet */
  css: t.string,
  /** Path to localizations directory */
  messages: t.string,
});

/** Type override */
export type TCFConfig = t.TypeOf<typeof TCFConfig>;

/** Configuration that are passed directly to the TCF module, not via airgap.j */
export const TCFBundledDataConfig = t.partial({
  /** Mapping of TCF Purpose ID to airgap tracking types */
  purposeMap: t.array(t.tuple([t.number, t.array(t.string)])),
  /** These TCF purposes cannot be processed on the basis of legitimate interests */
  restrictLegitimateInterestPurposes: t.array(t.number),
  /** Vendors that Transcend Consent regulates because they haven't registered with IAB TCF */
  nonTcfVendors: t.array(NonTcfVendor),
  /** Comma separated list of languages to support in the UI */
  languages: t.string,
  /** Default locale to use for the UI internationalization  */
  locale: t.string,
  /**
   * Whether or not to enable integration between Google Consent Mode and TCF.
   * More docs here https://developers.google.com/tag-platform/security/guides/implement-TCF-strings#cmp-api
   */
  enableAdvertiserConsentMode: t.boolean,
});

/** Type override */
export type TCFBundledDataConfig = t.TypeOf<typeof TCFBundledDataConfig>;

/** Input for Consent manager UI configuration */
export const TCFConfigInput = t.partial(TCFConfig.props);

/** Type override */
export type TCFConfigInput = t.TypeOf<typeof TCFConfigInput>;

/** Collect top-level props from an io-ts interface, partial, or intersection codec. */
const collectCodecProps = (codec: t.Any): t.Props => {
  // io-ts does not expose `_tag` on `t.Any`; runtime codecs always have it.
  const tagged = codec as t.Any & { _tag?: string; types?: t.Any[]; props?: t.Props };
  if (tagged._tag === 'IntersectionType' && tagged.types) {
    return tagged.types.reduce<t.Props>(
      (props, type) => Object.assign(props, collectCodecProps(type)),
      {},
    );
  }
  if (
    (tagged._tag === 'InterfaceType' ||
      tagged._tag === 'PartialType' ||
      tagged._tag === 'StrictType') &&
    tagged.props
  ) {
    return { ...tagged.props };
  }
  return {};
};

/**
 * Marker the main backend writes in place of `overrides` when a record of consent would exceed
 * the 1,000 KiB Firehose record limit. Read by the ROC query and hydration API.
 * `BannerContext` never accepts it from clients.
 */
export const BannerContextOverridesDropped = t.type({
  dropped: t.literal(true),
  bytes: t.number,
});

/** Type override */
export type BannerContextOverridesDropped = t.TypeOf<typeof BannerContextOverridesDropped>;

const BannerContextOverridesExact = t.exact(
  t.partial({
    ...(collectCodecProps(LoadOptions) as {
      [K in keyof LoadOptions]-?: t.Type<LoadOptions[K]>;
    }),
    /** Consent UI variables set by the host page. */
    uiVariables: t.record(t.string, t.string),
  }),
);

/**
 * Partial `LoadOptions` plus `uiVariables` active for this banner. Unknown keys are stripped.
 * Backend markers (`{ dropped: true }`, `{ truncated: true }`) are rejected, because stripping
 * would otherwise turn them into `{}`.
 */
export const BannerContextOverrides = new t.Type<
  t.TypeOf<typeof BannerContextOverridesExact>,
  t.OutputOf<typeof BannerContextOverridesExact>,
  unknown
>(
  'BannerContextOverrides',
  BannerContextOverridesExact.is,
  (input, context) =>
    typeof input === 'object' && input !== null && ('dropped' in input || 'truncated' in input)
      ? t.failure(input, context, 'Overrides markers are not valid BannerContext overrides')
      : BannerContextOverridesExact.validate(input, context),
  BannerContextOverridesExact.encode,
);

/** Type override */
export type BannerContextOverrides = t.TypeOf<typeof BannerContextOverrides>;

/**
 * Context describing which consent banner was shown when consent was collected.
 * Unknown top-level keys are stripped (not rejected) so newer clients still validate on older backends.
 * Validated with BannerContext.decode when a record of consent is built; keep free of side effects.
 */
export const BannerContext = t.exact(
  t.intersection([
    t.type({
      /** Schema version. Any number decodes, so the shape can be incremented. */
      version: t.number,
      /** Client surface that collected consent. */
      property: t.union([t.literal('web'), t.literal('mobile')]),
      /** Consent UI deployment id. */
      deploymentId: t.string,
      /** Experience slug or name shown to the user. */
      experience: t.string,
      /** Variant slug or name shown to the user. */
      variant: t.string,
      /** Theme slug or name shown to the user. */
      theme: t.string,
      /** Locale used when the banner was shown. */
      locale: t.string,
    }),
    t.partial({
      /** UI layers the user saw before consenting. */
      layersSeen: t.array(t.union([t.literal('banner'), t.literal('modal')])),
      /** Privacy signals present when consent was collected. */
      signals: t.array(t.union([t.literal('GPC'), t.literal('DNT')])),
      /** Load-option overrides active for this banner. */
      overrides: BannerContextOverrides,
    }),
  ]),
);

/** Type override */
export type BannerContext = t.TypeOf<typeof BannerContext>;

/** Valid `BannerContext` sent by the web consent UI. */
export const bannerContextWebFixture: BannerContext = {
  version: 1,
  property: 'web',
  deploymentId: 'b90bbba4-cf11-40d4-9203-1f6424098694',
  experience: 'eu-gdpr',
  variant: 'default',
  theme: 'light',
  locale: 'en',
  layersSeen: ['banner', 'modal'],
  signals: ['GPC'],
  overrides: {
    forceTheme: 'light',
    uiVariables: { brandName: 'Acme' },
  },
};

/** Valid `BannerContext` sent by the mobile consent UI. */
export const bannerContextMobileFixture: BannerContext = {
  version: 1,
  property: 'mobile',
  deploymentId: '676e2789-6da2-4641-8224-48be5ff029de',
  experience: 'us-cpra',
  variant: 'compact',
  theme: 'dark',
  locale: 'en-US',
  layersSeen: ['banner'],
  signals: [],
};

/**
 * Properties exposed on `self` by the Transcend Smart Quarantine
 */
export type TranscendView = Window & {
  /** Transcend Smart Quarantine API */
  transcend: TranscendAPI;
};

export const DEFAULT_VIEW_STATE_BY_PRIVACY_REGIME: ExperienceToInitialViewState = {
  // EU
  GDPR: InitialViewState.QuickOptions,
  // Brazil
  LGPD: InitialViewState.QuickOptions,
  // Switzerland
  nFADP: InitialViewState.QuickOptions,
  // US: California
  CPRA: InitialViewState.Hidden,
  // US: Virginia
  CDPA: InitialViewState.Hidden,
  // US: Colorado
  CPA: InitialViewState.Hidden,
  // US: Nevada
  NEVADA_SB220: InitialViewState.Hidden,
  // Other
  Unknown: InitialViewState.Hidden,
  // US Do Not Sell/Share
  US_DNSS: InitialViewState.Hidden,
};
