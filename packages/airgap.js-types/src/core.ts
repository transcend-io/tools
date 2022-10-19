// external
import * as t from 'io-ts';

// main
import { valuesOf } from '@transcend-io/type-utils';

// local
import { ConfigurablePurpose, SpecialTrackingPurpose } from './enums';

/* eslint-disable max-lines */

/** Transcend logger items */
export type LogItem = {
  /** Log item content */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any;
  /** Log item styles */
  styles: string[];
};

/** Transcend logger entry tag */
export type LogTag = LogItem & {
  /** Log tag content must be a string */
  content: string;
  /** Log tags must have only one style */
  styles: string[1];
};

/** Transcend logger entry message */
export type LogMessage = LogItem;

/** Console-safe log levels */
export const ConsoleSafeLogLevel = t.keyof({
  info: null,
  log: null,
  warn: null,
  debug: null,
  error: null,
  trace: null,
  // meta-levels:
  group: null,
  groupCollapsed: null,
  groupEnd: null,
});

/** Override type */
export type ConsoleSafeLogLevel = t.TypeOf<typeof ConsoleSafeLogLevel>;

/** Airgap log levels */
export const LogLevel = t.union([ConsoleSafeLogLevel, t.literal('fatal')]);
/** Override type */
export type LogLevel = t.TypeOf<typeof LogLevel>;

/** Airgap logger entry types */
export type LogEntryType = LogLevel;

/** Airgap logger entries */
export type LogEntry = {
  /** Log entry tag */
  tag: LogTag;
  /** Log entry message */
  message: LogMessage;
};

/**
 * Log emitter function
 */
export type LogEmitter = {
  /** Styled log emitter function */
  styled(styles?: null | string | string[], ...entries: any[]): void; // eslint-disable-line @typescript-eslint/no-explicit-any,max-len
} & ((...entries: any[]) => void); // eslint-disable-line @typescript-eslint/no-explicit-any

/** Transcend Logger API */
export type Logger = {
  /**
   * Set log tag during callback execution or from
   * this point on if no callback is provided.
   */
  tag(logTag: string, callback?: () => any): void; // eslint-disable-line @typescript-eslint/no-explicit-any
} & {
  /** Log emitter (e.g. `logger.log()`) */
  [method in LogLevel]: LogEmitter;
};

/** AirgapAuth auth options */
export type AirgapAuthMap = {
  /** A `load` event from a just-loaded airgap.js script element (which implies auth by being loaded before airgap.js) */
  load?: Event;
  /** A user-initiated interaction event that was just dispatched. */
  interaction?: UIEvent;
  /** Automatically reload the page if needed to remove CSP. `false` by default. */
  autoReload?: boolean;
};

/** Airgap authorization proof */
export type AirgapAuth =
  | null
  | AirgapAuthMap
  /** A user-initiated interaction event that was just dispatched. */
  | UIEvent
  /** A `load` event from a just-loaded airgap.js script element (which implies auth by being loaded before airgap.js) */
  | Event;

/** A boolean value represented as either `'on'` or `'off'` */
export const BooleanString = t.keyof({
  on: null,
  off: null,
});
/** Type override */
export type BooleanString = t.TypeOf<typeof BooleanString>;

/** Data privacy legal regimes */
export type PrivacyRegime = string;

export interface GetPurposeTypesOptions {
  /** Regimes to include */
  regimes?: PrivacyRegime[];
  /** Privacy signals to include */
  signals?: UserPrivacySignal[];
}

/**
 * Regime to purpose scope map
 */
export type RegimeToPurposeScopes = [PrivacyRegime[], TrackingPurpose[]][];

/** setConsent() options */
export interface ConsentOptions {
  /** Was consent confirmed by the user? */
  confirmed?: boolean;
}

/** airgap.js API */
export type AirgapAPI = Readonly<{
  /** Airgap ready event subscriber */
  ready(callback: (airgap: AirgapAPI) => void): void;
  /** Queue of callbacks to dispatch once airgap is ready */
  readyQueue?: ((airgap: AirgapAPI) => void)[];
  /** Enqueue cross-domain data sync across all airgap bundle domains */
  sync(): Promise<void>;
  /** Resolve airgap request overrides for a URL */
  resolve(url: Stringifiable): Stringifiable;
  /** Get tracking consent */
  getConsent(): TrackingConsentDetails;
  /** Set tracking consent */
  setConsent(
    /** Airgap auth proof */
    auth: AirgapAuth,
    /** The tracking consent options. */
    consent: TrackingConsent,
    /** Consent options */
    options?: ConsentOptions,
  ): boolean;
  /** Consents the user to all tracking purposes (requires recent UI interaction) */
  optIn(
    /** Airgap auth proof */
    auth: AirgapAuth,
  ): boolean;
  /** Revokes consent for all tracking purposes (requires recent UI interaction) */
  optOut(
    /** Airgap auth proof */
    auth: AirgapAuth,
  ): boolean;
  /** Returns true if the user is fully-opted in to all first-order tracking purposes */
  isOptedIn(): boolean;
  /** Returns true if the user is fully-opted out to all first-order tracking purposes */
  isOptedOut(): boolean;
  /** Resolve regime tracking purposes. If no regimes are provided, then the user's detected regimes are used */
  getRegimePurposes(regimes?: Set<PrivacyRegime>): Set<TrackingPurpose>;
  /** Get initialized tracking purposes config */
  getPurposeTypes(): TrackingPurposesTypes;
  /** Clear airgap queue & caches. Returns `true` on success. */
  clear(auth: AirgapAuth): boolean;
  /** Reset airgap queue and consent. Returns `true` on success. */
  reset(
    /** An airgap auth proof */
    auth: AirgapAuth,
    /** Automatically reload the page if needed to remove CSP. */
    autoReload?: boolean,
  ): boolean;
  /** Get a list of legal regimes that are potentially applicable to the user */
  getRegimes(): Set<PrivacyRegime>;
  /** Get a list of detected active user agent privacy signals */
  getPrivacySignals(): Set<UserPrivacySignal>;
  /** airgap.js version number */
  version: string;
}> &
  EventTarget;

/**
 * airgap.js event type
 */
export type AirgapEventType = 'consent-change' | 'purpose-map-load';

/** 'consent-change' custom event details */
export type ConsentChangeEventDetails = {
  /** The old tracking consent */
  oldConsent: TrackingConsentDetails;
  /** The new tracking consent */
  consent: TrackingConsentDetails;
  /** The tracking consent diff (what's changed in the new consent) */
  changes: ConsentChange | null;
};

/** Removable process (can remove watchers, overrides, and protections) */
export type Removable = {
  /** Remove/revoke process */
  remove(): void;
};

/** Any value which implements `toString()` */
export type Stringifiable =
  | string
  | (string & {
      toString(): string;
    });

/** Special `defaultConsent` automatic opt-out value for any potential reason */
export const AutoOptOut = t.literal('Auto');
/** Type override */
export type AutoOptOut = t.TypeOf<typeof AutoOptOut>;

/** Special `defaultConsent` automatic opt-out value for GDPR-protected users */
export const AutoOptOutForGDPR = t.literal('AutoGDPR');
/** Type override */
export type AutoOptOutForGDPR = t.TypeOf<typeof AutoOptOutForGDPR>;

/**
 * Special `defaultConsent` automatic opt-out value for users with DNT enabled.
 * Note that DNT is enabled by default for some browsers.
 */
export const AutoOptOutForDNT = t.literal('AutoDNT');
/** Type override */
export type AutoOptOutForDNT = t.TypeOf<typeof AutoOptOutForDNT>;

/**
 * Special `defaultConsent` automatic opt-out value for users with GPC enabled.
 */
export const AutoOptOutForGPC = t.literal('AutoGPC');
/** Type override */
export type AutoOptOutForGPC = t.TypeOf<typeof AutoOptOutForGPC>;

/** Potential values for `defaultConsent` config token list */
export const DefaultConsentConfigValue = t.union([
  t.boolean,
  AutoOptOut,
  AutoOptOutForGDPR,
  AutoOptOutForDNT,
  AutoOptOutForGPC,
  BooleanString,
]);
/** Type override */
export type DefaultConsentConfigValue = t.TypeOf<
  typeof DefaultConsentConfigValue
>;

/** User-configurable user agent privacy signal */
export const UserPrivacySignal = t.union([
  /** Global Privacy Control */
  t.literal('GPC'),
  /** Do Not Track */
  t.literal('DNT'),
]);

/** type overload */
export type UserPrivacySignal = t.TypeOf<typeof UserPrivacySignal>;

/** Tracking purpose metadata */
export const TrackingPurposeDetails = t.intersection([
  t.type({
    /** Tracking purpose name */
    name: t.string,
    /** Tracking purpose description (used in Consent Manager UI) */
    description: t.string,
    /** Tracking purpose default consent (default: false) */
    defaultConsent: DefaultConsentConfigValue,
    /**
     * Is this a first-order tracking purpose? If false, this is a
     * second-order tracking purpose that should only be used for
     * request overrides.
     *
     * This parameter previously meant:
     *   Show tracking purpose in consent manager UI.
     *
     * Default value: true
     */
    showInConsentManager: t.boolean,
    /** Allow user to configure their consent for this purpose (default: true) */
    configurable: t.boolean,
    /** Is tracking purpose "essential" - i.e. consent is mandatory / equivalent to 'essential' permission (default: false) */
    essential: t.boolean,
  }),
  t.partial({
    /** Tracking type */
    trackingType: valuesOf(ConfigurablePurpose),
    /** Respected opt-out privacy signals */
    optOutSignals: t.array(UserPrivacySignal),
  }),
]);
/** Type override */
export type TrackingPurposeDetails = t.TypeOf<typeof TrackingPurposeDetails>;

/** Tracking purposes types configuration */
export const TrackingPurposesTypes = t.record(t.string, TrackingPurposeDetails);
/** Type override */
export type TrackingPurposesTypes = t.TypeOf<typeof TrackingPurposesTypes>;

/** Fully-resolved `defaultConsent` config */
export const DefaultConsentConfig = t.record(
  t.string,
  DefaultConsentConfigValue,
);
/** Type override */
export type DefaultConsentConfig = t.TypeOf<typeof DefaultConsentConfig>;

/** Tracking purposes configuration */
export const TrackingPurposesConfig = t.intersection([
  t.type({
    /** Inherit default tracking purposes config */
    useDefault: t.boolean,
    types: TrackingPurposesTypes,
  }),
  t.partial({
    defaultConsent: t.union([DefaultConsentConfigValue, DefaultConsentConfig]),
  }),
]);

/** Type override */
export type TrackingPurposesConfig = {
  /** Inherit default tracking purposes config (Functional, Advertising, Analytics) */
  useDefault: boolean;
  /** Tracking purpose types */
  types: TrackingPurposesTypes;
  /** Default consent states (takes precedence over `TrackingPurposesTypes[purpose].defaultConsent`) */
  defaultConsent?: DefaultConsentConfigValue | DefaultConsentConfig;
};

/** Tracking purpose consent config */
export type TrackingConsent = {
  /** Consent to tracking for essential purposes */
  Essential?: true;
  /** Unknown (unable to be directly consented) */
  Unknown?: false;
  /** Custom tracking purpose */
  [purpose: string]: boolean | undefined;
};

/** Tracking purpose consent config with timestamp & auth metadata */
export type TrackingConsentDetails = {
  /** Tracking consent config */
  purposes: TrackingConsent;
  /**
   * Was tracking consent confirmed by the user?
   * If this is false, the consent was resolved from defaults & is not yet confirmed
   */
  confirmed: boolean;
  /** Consent last-modified timestamp (ISO 8601) */
  timestamp: string;
};

/** Tracking purpose */
export const TrackingPurpose = t.union([
  t.keyof(SpecialTrackingPurpose),
  t.string,
]);

/** Type override */
export type TrackingPurpose = t.TypeOf<typeof TrackingPurpose>;

/** Tracking purposes */
export type TrackingPurposes = Set<TrackingPurpose>;

/** Tracking consent change diffs */
export const ConsentChange = t.record(TrackingPurpose, t.boolean);

/** type overload */
export type ConsentChange = t.TypeOf<typeof ConsentChange>;

/* eslint-enable max-lines */
