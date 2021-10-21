// external
import * as t from 'io-ts';

// main
import { valuesOf } from './type-utils';

// local
import {
  DismissedViewState,
  InitialViewState,
  PrivacyRegimeEnum,
} from './enums';

/** Transcend Smart Quarantine API (window.transcend) */
export type PreInitTranscendAPI = {
  /** Ready event subscriber */
  ready(callback: (transcend: TranscendAPI) => void): void;
};

/**
 * Transcend Consent Manager external methods
 */
export type ConsentManagerAPI = {
  /** Show consent manager unless recently dismissed */
  autoShowConsentManager(): Promise<void>;
  /** Show consent manager */
  showConsentManager(): Promise<void>;
  /** Hide consent manager */
  hideConsentManager(): Promise<void>;
  /** Toggle consent manager */
  toggleConsentManager(): Promise<void>;
};

/** Transcend Smart Quarantine API (window.transcend) */
export type TranscendAPI = PreInitTranscendAPI & ConsentManagerAPI;

/**
 * Customer theming
 */
const Theme = t.type({
  /** Primary color */
  primaryColor: t.string,
  /** Font color */
  fontColor: t.string,
});

/**
 * Mobile-first responsive breakpoints
 * No media query for mobile, which is the default
 */
const Breakpoints = t.type({
  /** In px, at or above this width is tablet */
  tablet: t.string,
  /** In px, at or above this width is desktop */
  desktop: t.string,
});

/** Consent manager UI configuration */
export const ConsentManagerConfig = t.type({
  /** Customer theming */
  theme: Theme,
  /** A set of responsive breakpoints */
  breakpoints: Breakpoints,
  /** The privacy policy URL to redirect to */
  privacyPolicy: t.string,
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
