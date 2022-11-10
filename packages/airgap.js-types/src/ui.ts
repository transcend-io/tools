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
  /** The selected language (otherwise falls back to default) */
  locale?: ConsentManagerLanguageKey;
}

/**
 * Transcend Consent Manager external methods
 */
export type ConsentManagerAPI = {
  /** Possible ViewState values */
  viewStates: Set<ViewState>;
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

/**
 * Properties exposed on `self` by the Transcend Smart Quarantine
 */
export type TranscendView = Window & {
  /** Transcend Smart Quarantine API */
  transcend: TranscendAPI;
};

export const DEFAULT_VIEW_STATE_BY_PRIVACY_REGIME: PrivacyRegimeToInitialViewState =
  {
    // California
    CPRA: InitialViewState.Hidden,
    // EU
    GDPR: InitialViewState.QuickOptions,
    // Brazil
    LGPD: InitialViewState.QuickOptions,
    // Virginia
    CDPA: InitialViewState.NoticeAndDoNotSell,
    // Colorado
    CPA: InitialViewState.NoticeAndDoNotSell,
    // Other
    Unknown: InitialViewState.Hidden,
  };
