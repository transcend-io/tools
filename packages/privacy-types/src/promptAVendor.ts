import { makeEnum } from '@transcend-io/type-utils';

/**
 * Prompt-a-Vendor email send type.
 */
export const PromptAVendorEmailSendType = makeEnum({
  /** Send a single email encapsulating all profiles, i.e. at the RequestDataSilo level. */
  PerDsr: 'PER_DSR',
  /** Send an email for all DSRs, that the vendor has not been notified of yet. */
  CrossDsr: 'CROSS_DSR',
});

/**
 * Type overload
 */
export type PromptAVendorEmailSendType =
  (typeof PromptAVendorEmailSendType)[keyof typeof PromptAVendorEmailSendType];

/**
 * Prompt-a-Vendor Email Completion link type.
 */
export const PromptAVendorEmailCompletionLinkType = makeEnum({
  /** Present a link that requires a user logged into Transcend. */
  LoggedInUser: 'LOGGED_IN_USER',
  /**
   * Present a link that allows an external, unauthenticated user
   * to access the Bulk Requests UI.
   */
  UnauthenticatedExternalUser: 'UNAUTHENTICATED_EXTERNAL_USER',
  /**
   * Send no completion fulfillment link, and mark each datapoint
   * as resolved, once the email is sent.
   */
  NoLinkMarkDatapointAsResolved: 'NO_LINK_MARK_DATAPOINT_AS_RESOLVED',
});

/**
 * Type overload
 */
export type PromptAVendorEmailCompletionLinkType =
  (typeof PromptAVendorEmailCompletionLinkType)[keyof typeof PromptAVendorEmailCompletionLinkType];
