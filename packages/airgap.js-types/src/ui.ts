// external
import * as t from 'io-ts';

// main
import { applyEnum, valuesOf } from '@transcend-io/type-utils';

// local
import {
  CustomConsentManagerStyle,
  DismissedViewState,
  InitialViewState,
  PrivacyRegimeEnum,
  ViewState,
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
export type ConsentManagerAPI = {
  /** Possible ViewState values */
  viewStates: Set<ViewState>;
  /** Show consent manager unless recently dismissed */
  autoShowConsentManager(options?: ShowConsentManagerOptions): Promise<void>;
  /** Show consent manager */
  showConsentManager(options?: ShowConsentManagerOptions): Promise<void>;
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
 * Custom styles
 */
export const ConsentManagerThemeStyles = t.partial(
  applyEnum(CustomConsentManagerStyle, () => t.string),
);
/** Type override */
export type ConsentManagerThemeStyles = t.TypeOf<
  typeof ConsentManagerThemeStyles
>;

/**
 * Customer theming
 */
export const ConsentManagerTheme = t.intersection([
  t.type({
    /** Primary color */
    primaryColor: t.string,
    /** Font color */
    fontColor: t.string,
  }),
  t.partial({
    /** Custom CSS */
    styles: ConsentManagerThemeStyles,
  }),
]);

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
  initialViewStateByPrivacyRegime: t.record(
    valuesOf(PrivacyRegimeEnum),
    valuesOf(InitialViewState),
  ),
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
