// external
import * as t from 'io-ts';

// main
import { applyEnum, valuesOf } from '@transcend-io/type-utils';
import type { ConsentManagerLanguageKey } from '@transcend-io/internationalization';

// local
import {
  ViewState,
  InitialViewState,
  PrivacyRegimeEnum,
  DismissedViewState,
} from './enums';
import { AirgapAuth } from './core';

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
 * Transcend Consent Manager external methods
 */
export type ConsentManagerAPI = Readonly<{
  /** Possible ViewState values */
  viewStates: Set<ViewState>;
  /** Expose an option to grab the current view state */
  getViewState: () => ViewState;
  /** Change the current privacy policy URL */
  setPrivacyPolicy: (privacyPolicyLink: string) => void;
  /** Change the current secondary policy URL */
  setSecondaryPolicy: (privacyPolicyLink: string) => void;
  /** Show consent manager unless recently dismissed */
  autoShowConsentManager(options?: ShowConsentManagerOptions): Promise<void>;
  /** Show consent manager */
  showConsentManager(options?: ShowConsentManagerOptions): Promise<void>;
  /** Set the current active language */
  setActiveLocale(locale: ConsentManagerLanguageKey): Promise<void>;
  /** Toggle consent manager */
  toggleConsentManager(options?: ShowConsentManagerOptions): Promise<void>;
  /** Hide consent manager */
  hideConsentManager(): Promise<void>;
  /** Opt out of the sale of personal info & show a disclosure */
  doNotSell(
    auth: AirgapAuth,
    options?: ShowConsentManagerOptions,
  ): Promise<void>;
  /** Opt out of all purposes */
  optOutNotice(
    auth: AirgapAuth,
    options?: ShowConsentManagerOptions,
  ): Promise<void>;
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
export type ConsentManagerBreakpoints = t.TypeOf<
  typeof ConsentManagerBreakpoints
>;

export const PrivacyRegimeToInitialViewStateInput = t.partial(
  applyEnum(PrivacyRegimeEnum, () => valuesOf(InitialViewState)),
);

/** type overload */
export type PrivacyRegimeToInitialViewStateInput = t.TypeOf<
  typeof PrivacyRegimeToInitialViewStateInput
>;

export const PrivacyRegimeToInitialViewState = t.record(
  valuesOf(PrivacyRegimeEnum),
  valuesOf(InitialViewState),
);

/** type overload */
export type PrivacyRegimeToInitialViewState = t.TypeOf<
  typeof PrivacyRegimeToInitialViewState
>;

/** Consent manager UI configuration */
export const ConsentManagerConfig = t.type({
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
  initialViewStateByPrivacyRegime: PrivacyRegimeToInitialViewState,
  /** What state the consent manager should go to when dismissed */
  dismissedViewState: valuesOf(DismissedViewState),
});

/** Type override */
export type ConsentManagerConfig = t.TypeOf<typeof ConsentManagerConfig>;

/** Input for Consent manager UI configuration */
export const ConsentManagerConfigInput = t.partial(ConsentManagerConfig.props);

/** Type override */
export type ConsentManagerConfigInput = t.TypeOf<
  typeof ConsentManagerConfigInput
>;

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

/** Input for Consent manager UI configuration */
export const TCFConfigInput = t.partial(TCFConfig.props);

/** Type override */
export type TCFConfigInput = t.TypeOf<typeof TCFConfigInput>;

/**
 * Properties exposed on `self` by the Transcend Smart Quarantine
 */
export type TranscendView = Window & {
  /** Transcend Smart Quarantine API */
  transcend: TranscendAPI;
};

export const DEFAULT_VIEW_STATE_BY_PRIVACY_REGIME: PrivacyRegimeToInitialViewState =
  {
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
  };
