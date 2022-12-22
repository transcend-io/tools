// main
import { makeEnum } from '@transcend-io/type-utils';

/**
 * Consent Manager view states that can be used at launch
 */
export const InitialViewState = makeEnum({
  /* expanded and showing quick select options */
  QuickOptions: 'QuickOptions',
  /* three option UI: essential, functional/analytics, advertising */
  QuickOptions3: 'QuickOptions3',
  /* accept all or more options */
  AcceptAll: 'AcceptAll',
  /* accept all or reject all */
  AcceptOrRejectAll: 'AcceptOrRejectAll',
  /* accept or reject the Analytics script tag */
  AcceptOrRejectAnalytics: 'AcceptOrRejectAnalytics',
  /* data collection notice with do not sell */
  NoticeAndDoNotSell: 'NoticeAndDoNotSell',
  /* open a modal that allows for an explanation of do not sell/share, before opting out */
  DoNotSellExplainer: 'DoNotSellExplainer',
  /* notice that do not sell has been acknowledged properly */
  DoNotSellDisclosure: 'DoNotSellDisclosure',
  /* open a modal that shows a notice that the privacy policy has changed, without any prompt to change consent */
  PrivacyPolicyNotice: 'PrivacyPolicyNotice',
  /* expanded and showing full checkbox options */
  CompleteOptions: 'CompleteOptions',
  /* complete options, but selecting a checkbox means the user is opted out */
  CompleteOptionsInverted: 'CompleteOptionsInverted',
  /* hidden */
  Hidden: 'Hidden',
});

/**
 * Type override
 */
export type InitialViewState =
  typeof InitialViewState[keyof typeof InitialViewState];

/**
 * Consent Manager view states that can be navigated to after initial view state
 */
export const DeepViewState = makeEnum({
  /* language options */
  LanguageOptions: 'LanguageOptions',
});

/**
 * Type override
 */
export type DeepViewState = typeof DeepViewState[keyof typeof DeepViewState];

/**
 * Consent Manager view states after it's been dismissed
 */
export const DismissedViewState = makeEnum({
  /* showing and collapsed */
  Collapsed: 'Collapsed',
  /* closed */
  Closed: 'Closed',
});

/**
 * Type override
 */
export type DismissedViewState =
  typeof DismissedViewState[keyof typeof DismissedViewState];

/**
 * All possible view states of the Consent Manager
 */
export const ViewState = makeEnum({
  ...InitialViewState,
  ...DeepViewState,
  ...DismissedViewState,
});

/**
 * Type override
 */
export type ViewState = typeof ViewState[keyof typeof ViewState];
