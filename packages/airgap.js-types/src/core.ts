// external
import * as t from 'io-ts';

// main
import { FixedLengthArray, valuesOf } from '@transcend-io/type-utils';

// local
import { SpecialTrackingPurpose, ViewState } from './enums';

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
  interaction?: Event;
  /** Automatically reload the page if needed to remove CSP. `false` by default. */
  autoReload?: boolean;
  /**
   * Additional authorization key automatically conferred by airgap.js via setAuth() API for UI modules.
   * Required when optional strict authorization mode is enabled.
   */
  key?: symbol;
};

/** Airgap authorization proof */
export type AirgapAuth =
  | null
  | AirgapAuthMap
  /**
   * A user-initiated interaction event that was just dispatched, or
   * a `load` event from a just-loaded airgap.js script element (which implies auth by being loaded before airgap.js).
   */
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

/** Reserved metadata, currently used for airgap module data syncing */
export interface ReservedMetadata {
  /** Top-level key to avoid polluting the metadata key space */
  tcmp?: Record<string, unknown>;
}

/**
 * Extra metadata to be synced along with consent
 */
export type Metadata = Record<string, unknown>;

/** setConsent() options */
export interface ConsentOptions {
  /** Was consent confirmed by the user? */
  confirmed?: boolean;
  /** Was the UI shown to the user? */
  prompted?: boolean;
  /**
   * Extra metadata to be synced along with consent
   *
   * Special values:
   * - `null` - Do not change metadata
   * - `false` - Clear metadata
   */
  metadata?: (Metadata & ReservedMetadata) | null | false;
  /** Last updated for metadata */
  metadataTimestamp?: string;
  /** Whether or not to return a Promise so that the caller can wait for sync to complete. By default, we do not wait for sync */
  waitForSync?: boolean;
  /** Last updated */
  timestamp?: string;
}

/** airgap.toggle() options */
export type AirgapToggleOptions =
  /** Protection state */
  | boolean
  | {
      /** Protection state */
      protection?: boolean;
    };

/** airgap.status format */
export interface AirgapSystemStatus {
  /** Protection system active state */
  protection: boolean;
  /** Have any CSPs been activated? */
  csp: boolean;
  /** Monitoring system active state */
  monitoring: boolean;
  /** Telemetry system active state */
  telemetry: boolean;
}

/**
 * Request override config
 */
export interface RequestOverride {
  /** Optional tracking purposes to gate the override with lack of consent */
  unconsented?: TrackingPurpose[];
  /**
   * Optional request matcher. This is a RegExp object (or string input
   * for the RegExp constructor). Overrides apply to all requests
   * when this is undefined.
   */
  matcher?: RegExp | string;
  /** Override executor function or replacement string */
  override: string | ((request: IPendingEvent, matcher?: RegExp) => void);
  /** Name */
  name?: string;
  /** Note */
  note?: string;
  /** Description */
  description?: string;
}

/** Airgap watcher */
export type AirgapWatcher = (request: IPendingEvent) => void;

/**
 * Cookie override handler. This function can modify attempted cookie mutations.
 */
export type CookieOverride = (event: IPendingCookieMutation) => void;

/**
 * Passive cookie watcher. This function can view attempted cookie mutations in a read-only state.
 */
export type CookieWatcher = (event: IPendingCookieMutation) => void;

/** Event types (for purpose resolution) */
export type TrackingEventType = 'request' | 'cookie';

/** airgap.js API */
export type AirgapAPI = Readonly<{
  /** Embedded request watchers */
  watchers?: AirgapWatcher[];
  /** Embedded request overrides (must specify pre-init) */
  overrides?: RequestOverride[];
  /** Embedded request overrides (must specify pre-init) */
  cookieOverrides?: CookieOverride[];
  /** Airgap ready event subscriber */
  ready(callback: (airgap: AirgapAPI) => void): void;
  /** Queue of callbacks to dispatch once airgap is ready */
  readyQueue?: ((airgap: AirgapAPI) => void)[];
  /** Enqueue cross-domain data sync across all airgap bundle domains */
  sync(): Promise<void>;
  /**
   * Resolve URL input reserialization post-regulation.
   * @param resolveOverrides - Resolve overrides. Defaults to true.
   */
  resolve(url: Stringifiable, resolveOverrides?: boolean): Stringifiable;
  /**
   * Resolve consent status for given tracking purposes. Essential purposes override opted out unessential purposes.
   *
   * If `use` is not provided, consent is resolved for both request and cookie tracking event types.
   * @param trackingPurposes - Tracking purposes to resolve
   * @param use - Optional event type to use for tracking purpose resolution
   * @returns `true` if the applicable tracking purposes are consented.
   */
  isConsented(
    trackingPurposes: TrackingPurposes,
    use?: TrackingEventType,
  ): boolean;
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
  ): Promise<boolean> | boolean;
  /** Sets whether or not the Consent UI has been shown to the user */
  setPrompted(state: boolean): Promise<void>;
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
  /** Override pending requests */
  override(auth: AirgapAuth, ...overrides: RequestOverride[]): Removable;
  /** Override cookies */
  overrideCookies(
    auth: AirgapAuth,
    handler: (event: IPendingCookieMutation) => void,
  ): Removable;
  /** Listen to pending requests passively */
  watch(watcher: AirgapWatcher): Removable;
  /** Listen to cookies passively */
  watchCookies(watcher: CookieWatcher): Removable;
  /** Clear airgap queue & caches. Returns `true` on success. */
  clear(auth: AirgapAuth): boolean;
  /** Reset airgap queue and consent. Returns `true` on success. */
  reset(
    /** An airgap auth proof */
    auth: AirgapAuth,
    /** Automatically reload the page if needed to remove CSP. */
    autoReload?: boolean,
  ): boolean;
  /** Check whether a URL is allowed to be loaded */
  isAllowed(
    /** URL to evaluate */
    url: Stringifiable,
    /** Should overrides be resolved? true by default */
    resolveOverrides?: boolean,
  ): Promise<boolean>;
  /** Check whether a cookie is allowed to be set */
  isCookieAllowed(
    /** IPendingCookieMutation-like object to evaluate */
    cookie: string | IPendingCookieMutation | PendingCookieMutationInit,
    /** Should overrides be resolved? true by default */
    resolveOverrides?: boolean,
  ): Promise<boolean>;
  /** Check whether a IPendingRequest is allowed to be loaded */
  isRequestAllowed(
    /** IPendingEvent to inspect */
    request: IPendingEvent,
    /** Should overrides be resolved? true by default */
    resolveOverrides?: boolean,
  ): Promise<boolean>;
  /** Get purposes of URL */
  getPurposes(
    /** URL to evaluate */
    url: Stringifiable,
    /** Should overrides be resolved? true by default */
    resolveOverrides?: boolean,
  ): Promise<TrackingPurposes>;
  /** Get purposes of IPendingRequest */
  getRequestPurposes(
    /** IPendingEvent-like object to inspect */
    request: string | IPendingEvent | PendingRequestInit,
    /** Should overrides be resolved? true by default */
    resolveOverrides?: boolean,
  ): Promise<TrackingPurposes>;
  /** Get purposes of a cookie */
  getCookiePurposes(
    /** IPendingCookieMutation-like object to evaluate */
    cookie: string | IPendingCookieMutation | PendingCookieMutationInit,
    /** Should overrides be resolved? true by default */
    resolveOverrides?: boolean,
  ): Promise<TrackingPurposes>;
  /** Export queues */
  export(options?: AirgapExportOptions): AirgapQueues;
  /** Get a list of legal regimes that are potentially applicable to the user */
  getRegimes(): Set<PrivacyRegime>;
  /** Get a list of detected active user agent privacy signals */
  getPrivacySignals(): Set<UserPrivacySignal>;
  /** Toggle all airgap.js protections. Auth must be a pre-airgap.js or airgap.js script 'load' event. Returns success status */
  toggle(auth: AirgapAuth, options?: AirgapToggleOptions): boolean;
  /** Current airgap.js system flags */
  status: AirgapSystemStatus;
  /** airgap.js version number */
  version: string;
  /** override the event listener signature for consent change events */
  addEventListener: (
    type: AirgapConsentEventType,
    callback: ((evt: ConsentChangeEventPayload) => void) | null,
    options?: boolean | AddEventListenerOptions | undefined,
  ) => void;
}> &
  EventTarget;

/** airgap.export() options */
export interface AirgapExportOptions {
  /** Send output to web endpoint */
  endpoint?: string;
  /** JSON pretty-print indentation (default: 0) */
  space?: number;
  /** Save output to disk (default: off) */
  save?: boolean;
  /** Filename for saving to disk */
  filename?: string;
}

/** Exported airgap queues & consent */
export type AirgapQueues = Readonly<{
  /** airgap.js version number */
  version: string;
  /** Current user consent details */
  consent: TrackingConsentDetails;
  /** Navigation page URL */
  url: Stringifiable;
  /** Pending requests */
  requests: PendingRequestDescriptor[];
  /** Pending mutations (same-session-only replay) */
  mutations: PendingMutationDescriptor[];
  /** Pending cookies */
  cookies: PendingCookieMutationDescriptor[];
  /** Pending cookies (same-session-only replay) */
  cookieMutations: PendingCookieMutationDescriptor[];
  /** Sent requests */
  sentRequests?: PendingRequestDescriptor[];
  /** Set cookies */
  setCookies?: PendingCookieMutationDescriptor[];
}>;

/**
 * Airgap event types that send the ConsentChangeEventDetails object with them
 */
export type AirgapConsentEventType =
  | 'consent-change'
  | 'sync'
  | 'consent-resolution';

/**
 * airgap.js event type
 */
export type AirgapEventType = AirgapConsentEventType | 'purpose-map-load';

export interface ConsentChangeEventPayload {
  /** consent change event details */
  detail: ConsentChangeEventDetails;
}

/** 'consent-change' custom event details */
export type ConsentChangeEventDetails = {
  /** The old tracking consent */
  oldConsent: TrackingConsentDetails | null;
  /** The new tracking consent */
  consent: TrackingConsentDetails | null;
  /** The tracking consent diff (what's changed in the new consent) */
  changes: Record<string, boolean> | null;
  /** Applicable privacy signals contributing to this consent change event */
  signals?: Set<UserPrivacySignal> | null;
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
    trackingType: t.string,
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

export const TrackingConsent = t.intersection([
  t.partial({
    Essential: t.literal(true),
    Unknown: t.literal(false),
  }),
  t.record(t.string, t.union([t.boolean, t.undefined])),
]);
/**
 * Type override
 */
export type TrackingConsent = t.TypeOf<typeof TrackingConsent>;

export const TrackingConsentWithNulls = t.record(
  t.string,
  t.union([t.boolean, t.undefined, t.null]),
);
/** Type override */
export type TrackingConsentWithNulls = t.TypeOf<
  typeof TrackingConsentWithNulls
>;

const TCFReservedMetadata = t.partial({
  tcString: t.string,
});

const ReservedMetadata = t.partial({
  tcmp: t.partial({
    tcf: TCFReservedMetadata,
  }),
});

export const CoreTrackingConsentDetails = t.intersection([
  t.type({
    /**
     * Was tracking consent confirmed by the user?
     * If this is false, the consent was resolved from defaults & is not yet confirmed
     */
    confirmed: t.boolean,
    /** Consent resolution/last-modified timestamp (ISO 8601) */
    timestamp: t.string,
  }),
  t.partial({
    /** Has the consent been updated (including no-change confirmation) since default resolution */
    updated: t.boolean,
    /** Whether or not the UI has been shown to the end-user (undefined in older versions of airgap.js) */
    prompted: t.boolean,
    /** Arbitrary metadata that customers want to be associated with consent state */
    metadata: t.intersection([ReservedMetadata, t.UnknownRecord]),
    /** When the metadata was last updated */
    metadataTimestamp: t.string,
  }),
]);

/** Type override */
export type CoreTrackingConsentDetails = t.TypeOf<
  typeof CoreTrackingConsentDetails
>;

export const TrackingConsentDetails = t.intersection([
  CoreTrackingConsentDetails,
  t.type({
    /** Tracking consent config */
    purposes: TrackingConsent,
  }),
]);

/** Override types. */
export type TrackingConsentDetails = t.TypeOf<typeof TrackingConsentDetails>;

export const TrackingConsentOptionalData = t.partial({
  /** Transparency Consent (TCF) String */
  tcf: t.string,
  /** US Privacy (USP) String */
  usp: t.string,
  /** Global Privacy Platform (GPP) String */
  gpp: t.string,
  /** Consent Manager View State */
  viewState: valuesOf(ViewState),
  /** Airgap Version */
  airgapVersion: t.string,
});

export const FullTrackingConsentDetails = t.intersection([
  TrackingConsentDetails,
  TrackingConsentOptionalData,
]);

/** Override types. */
export type FullTrackingConsentDetails = t.TypeOf<
  typeof FullTrackingConsentDetails
>;

export const FullTrackingConsentDetailsWithNulls = t.intersection([
  CoreTrackingConsentDetails,
  TrackingConsentOptionalData,
  t.type({
    /** Tracking consent config */
    purposes: TrackingConsentWithNulls,
  }),
]);

/** Override types. */
export type FullTrackingConsentDetailsWithNulls = t.TypeOf<
  typeof FullTrackingConsentDetailsWithNulls
>;

export const ConsentPreferencesBody = t.type({
  /** token containing encrypted identifier */
  token: t.string,
  /** consent partition (defaults to bundle id) */
  partition: t.string,
  /** user consent */
  consent: TrackingConsentDetails,
});

/** Override types. */
export type ConsentPreferencesBody = t.TypeOf<typeof ConsentPreferencesBody>;

export const ConsentTokenPayload = t.intersection([
  t.type({
    encryptedIdentifier: t.string,
  }),
  t.partial({
    deprecatedEncryptedIdentifiers: t.array(t.string),
  }),
]);

/** Type override */
export type ConsentTokenPayload = t.TypeOf<typeof ConsentTokenPayload>;

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

/** Regime purpose scopes configuration */
export const RegimePurposeScopesConfig = t.array(
  FixedLengthArray(2, 2, t.array(t.string)),
);

/** Type override */
export type RegimePurposeScopesConfig = [
  /** Regimes */
  regimes: string[],
  /** In-scope purposes */
  purposes: TrackingPurpose[],
][];

/** Request source types */
export type AirgapRequestSource =
  | 'unknown'
  | 'airgap.js' // emitted by airgap.isAllowed(), etc.
  | 'fetch'
  | 'xhr'
  | 'websocket'
  | 'webtransport'
  | 'service-worker'
  | 'shared-worker'
  | 'worker'
  | 'module-worker'
  | 'shared-module-worker'
  | 'eventsource'
  | 'beacon'
  | 'CSPV'
  | 'navigation'
  | 'open'
  | 'script'
  | AirgapDOMRequestSource;

/** DOM-initiated request source types */
export type AirgapDOMRequestSource =
  | 'DOM:style'
  | 'DOM:image'
  | 'DOM:media'
  | 'DOM:video'
  | 'DOM:audio'
  | 'DOM:track'
  | 'DOM:link'
  | 'DOM:form'
  | 'DOM:form-action'
  | 'DOM:view' // iframe {srcdoc, src}, object, embed
  | 'DOM:ping'
  | 'DOM:unknown';

/**
 * Airgap pending request descriptor init dictionary
 */
export interface PendingRequestInit {
  /** Request initiator type */
  type: AirgapRequestSource;
  /** Request URL */
  url: Stringifiable;
  /** Persist request for cross-session replay (false by default) */
  persist?: boolean;
  /** Request initialization data */
  requestInit?: RequestInit;
  /** Request timestamp (ISO 8601) */
  timestamp?: Stringifiable;
  /** Request DOM target */
  target?: Node | IDynamicNodeReference | null;
  /** Mutator to apply changes associated with the request */
  mutator?(): void;
  /** Serialize request or mutation state back to DOM patcher parser input */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serialize?(): any;
  /** Prevent credentials from being included in request */
  omitCredentials?(): boolean;
}

/** Properties that are added to instantiated PendingRequests */
export interface InstantiatedPendingRequestProps {
  /** Primary or first associated request URL input */
  url: Stringifiable;
  /** All associated request URL inputs */
  urls: Stringifiable[];
  /** Request timestamp (ISO 8601) */
  timestamp: Stringifiable;
  /** Serialize request or mutation state back to DOM patcher parser input */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serialize(): any;

  /** The following IPendingEvent APIs are only available to overrides: */

  /**
   * All associated resolved request URLs. null = invalid URL or data: URL (parsing
   * skipped to optimize performance)
   */
  URLs: (URL | null)[];
  /** Prevent credentials from being included in request */
  omitCredentials(): boolean;
  /** Whether or not request is currently allowed */
  allowed: boolean;
  /** Bypass our consent logic and force-allow request */
  allow(): void;
  /** Bypass our consent logic and force-deny request */
  deny(): void;
  /** Bypass our consent logic to force-deny request and also block it from entering the replay quarantine */
  block(): void;
  /** Resolved tracking purposes associated with this pending mutation */
  purposes: Set<TrackingPurpose>;
}

/**
 * Airgap pending request descriptor with script annotation
 */
export type PendingRequestDescriptor = PendingRequestInit &
  InstantiatedPendingRequestProps;

/** Airgap pending request descriptor init with multiple URLs */
export type PendingMutationInit = Omit<PendingRequestInit, 'url'> & {
  /** Request URLs */
  urls: Stringifiable[];
};

/** PendingEvent init input */
export type PendingEventInit = PendingRequestInit | PendingMutationInit;

/** Pending mutation descriptor */
export type PendingMutationDescriptor = PendingMutationInit &
  InstantiatedPendingRequestProps;

/** Pending event props that can't or won't be serialized to JSON */
type PendingEventUnserializableProps =
  | 'persist'
  | 'target'
  | 'mutator'
  | 'serialize'
  | 'URLs'
  | 'omitCredentials'
  | 'allow'
  | 'deny'
  | 'purposes'
  | 'allowed'
  | 'blocked';

/** JSON-safe representation of pending event tracking purposes */
interface PendingEventPurposesJSON {
  /** Tracking purposes list */
  purposes?: TrackingPurpose[];
}

/** Pending request subset to JSON-safe properties */
export type PendingRequestJSON = Omit<
  PendingRequestDescriptor,
  PendingEventUnserializableProps | 'urls'
> &
  PendingEventPurposesJSON;

/** Pending mutation subset to JSON-safe properties */
export type PendingMutationJSON = Omit<
  PendingMutationDescriptor,
  PendingEventUnserializableProps | 'url'
> &
  PendingEventPurposesJSON;

/** Airgap pending request interface */
export interface IPendingRequest extends PendingRequestDescriptor {
  /** Convert PendingRequest to JSON-safe representation */
  toJSON(): PendingRequestJSON;
}

/** Airgap pending mutation interface */
export interface IPendingMutation extends PendingMutationDescriptor {
  /** Convert PendingRequest to JSON-safe representation */
  toJSON(): PendingMutationJSON;
}

/** Pending event descriptor */
export type PendingEventDescriptor =
  | PendingRequestDescriptor
  | PendingMutationDescriptor;

/** Pending request or mutation */
export type IPendingEvent = IPendingMutation | IPendingRequest;

/** Unapproved request queue */
export type PendingRequestQueue = IPendingRequest[];

/** Unapproved mutation queue */
export type PendingMutationQueue = IPendingEvent[];

/** Unapproved event queue */
export type PendingEventQueue = IPendingEvent[];

/** Cookie descriptor */
export interface Cookie {
  /** Cookie name */
  name: Stringifiable;
  /** Cookie value */
  value?: Stringifiable;
  /** Cookie change event timestamp (ISO 8601) */
  timestamp?: string;
  /** Expiry date (UTC date string or DOMTimeStamp) */
  expires?: number | Stringifiable;
  /** Max cookie age (seconds) */
  maxAge?: number;
  /** Optional cookie host scope */
  domain?: Stringifiable;
  /** Optional cookie path scope */
  path?: Stringifiable;
  /** Should cookie only be sent in secure contexts? */
  secure?: boolean;
  /**
   * Should cookie be restricted to the same site?
   * Values: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite
   */
  sameSite?: Stringifiable;
  /**
   * Is the cookie partitioned (e.g. by CHIPS)?
   * See https://developer.mozilla.org/en-US/docs/Web/Privacy/Partitioned_cookies
   * and https://developer.mozilla.org/en-US/docs/Web/API/CookieStore/get#:~:text=of%20the%20cookie.-,partitioned,-A%20boolean%20indicating
   */
  partitioned?: boolean;
  /** Target document / node */
  target?: Node | null;
}

/**
 * PendingCookieMutation constructor input
 */
export interface PendingCookieMutationInit extends Cookie {
  /** Persist cookie for cross-session replay if quarantined (true by default) */
  persist?: boolean;
  /** Mutator to apply cookie mutation */
  mutator?(): void | Promise<void>;
}

/** Properties that are added to instantiated PendingCookieMutations */
export interface InstantiatedPendingCookieMutationProps {
  /** Expiry date (DOMTimeStamp) */
  expires?: number;
  /** Cookie change event timestamp (Date.now() format) */
  timestamp: string;
  /** Whether or not cookie is currently allowed. null = passthrough */
  allowed?: boolean | null;
  /** Whether or not cookie is currently disallowed & blocked from entering the quarantine */
  blocked?: boolean;
  /** Bypass our consent logic and force-allow cookie */
  allow(): void;
  /** Bypass our consent logic and force-deny cookie */
  deny(): void;
  /** Bypass our consent logic to force-deny cookie and also block it from entering the quarantine */
  block(): void;
  /** Resolved tracking purposes associated with this pending mutation */
  purposes: Set<TrackingPurpose>;
  /** Mutator to apply cookie mutation */
  mutator(): void | Promise<void>;
}

/** Pending cookie mutation descriptor */
export type PendingCookieMutationDescriptor = Omit<
  PendingCookieMutationInit,
  'expires'
> &
  InstantiatedPendingCookieMutationProps;

/** Pending cookie mutation props that can't or won't be serialized to JSON */
type PendingCookieMutationUnserializableProps =
  | 'persist'
  | 'mutator'
  | 'allow'
  | 'deny'
  | 'purposes'
  | 'allowed'
  | 'blocked';

/** JSON-safe representation of pending cookie mutation tracking purposes */
interface PendingCookieMutationPurposesJSON {
  /** Tracking purposes list */
  purposes?: TrackingPurpose[];
}

/** Pending request subset to JSON-safe properties */
export type PendingCookieMutationJSON = Omit<
  PendingCookieMutationDescriptor,
  PendingCookieMutationUnserializableProps
> &
  PendingCookieMutationPurposesJSON;

/** Airgap pending cookie mutation interface */
export interface IPendingCookieMutation
  extends PendingCookieMutationDescriptor {
  /** Convert PendingCookieMutation to JSON-safe representation */
  toJSON(): PendingCookieMutationJSON;
}

/** Pending cookie mutation queue */
export type PendingCookieQueue = IPendingCookieMutation[];

/** Interface for dynamic node references */
export interface IDynamicNodeReference {
  /**
   * Current node getter. This should always be used in `handleLiveMutation()`.
   * @returns current node
   */
  getNode(): Element;
  /**
   * Live node getter. Use this to apply mutations in `quarantine()`
   * and `quarantineMutation()` handlers.
   *
   * `release()` must always be called after completing
   * mutations using `getLiveNode()`.
   * @returns live node
   */
  getLiveNode(): Element;
  /** Release & garbage-collect internal node reference */
  release(): void;
}

/* eslint-enable max-lines */
