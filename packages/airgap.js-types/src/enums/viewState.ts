// main
import { makeEnum } from '@transcend-io/type-utils';

/**
 * Consent Manager view states that can be used at launch
 */
export const InitialViewState = makeEnum({
  /* expanded and showing quick select options */
  QuickOptions: 'QuickOptions',
  /* accept all or more options */
  AcceptAll: 'AcceptAll',
  /* accept all or reject all */
  AcceptOrRejectAll: 'AcceptOrRejectAll',
  /* data collection notice with do not sell */
  NoticeAndDoNotSell: 'NoticeAndDoNotSell',
  /* notice that do not sell has been acknowledged properly */
  DoNotSellDisclosure: 'DoNotSellDisclosure',
  /* expanded and showing full checkbox options */
  CompleteOptions: 'CompleteOptions',
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
