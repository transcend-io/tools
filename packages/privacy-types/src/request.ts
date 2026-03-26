import { makeEnum } from '@transcend-io/type-utils';

/**
 * The request statuses that a request can be created directly into.
 * This is useful for the purposes of uploading a backlog
 */
export const PreflightRequestStatus = makeEnum({
  /**
   * The privacy request should be canceled because the
   * user is not allowed to make the request. The user will be
   * notified via email of the cancellation.
   * Note: if the request is in silent mode, no emails are ever sent
   */
  CANCELED: 'CANCELED',
  /**
   * The privacy request is placed on hold and will need manual intervention.
   * This will not trigger a notification to the end user, but admin can be
   * notified that there is a request that requires their review.
   */
  ON_HOLD: 'ON_HOLD',
});

/** Type override */
export type PreflightRequestStatus =
  (typeof PreflightRequestStatus)[keyof typeof PreflightRequestStatus];

/**
 * The request statuses that a request can be created directly into.
 * This is useful for the purposes of uploading a backlog
 */
export const CompletedRequestStatus = makeEnum({
  /** The data subject failed to verify at least one of the identifier they submit through the form */
  FailedVerification: 'FAILED_VERIFICATION',
  /** The request has been approved and sent to the data subject with no secondary action */
  Completed: 'COMPLETED',
  /** The request was canceled and the data subject was notified */
  Canceled: 'CANCELED',
  /** The secondary request action completed compilation */
  SecondaryCompleted: 'SECONDARY_COMPLETED',
  /** The request was revoked because it was a duplicate (another open request covers it) */
  Revoked: 'REVOKED',
});

/** Type override */
export type CompletedRequestStatus =
  (typeof CompletedRequestStatus)[keyof typeof CompletedRequestStatus];

/**
 * The statuses that a request can take on
 */
export const RequestStatus = makeEnum({
  /** A data subject submits a DSR */
  RequestMade: 'REQUEST_MADE',
  /** The data subject failed to verify at least one of the identifier they submit through the form */
  FailedVerification: 'FAILED_VERIFICATION',
  /** The request identifiers have been verified and they are enriched to create other identifiers */
  Enriching: 'ENRICHING',
  /** The request is temporarily placed on hold */
  OnHold: 'ON_HOLD',
  /** The request is waiting to compile */
  Waiting: 'WAITING',
  /** The request begins compiling across the organization's Connected Services, specific to the actions requested */
  Compiling: 'COMPILING',
  /** The request is compiled and appending review before send */
  Approving: 'APPROVING',
  /** The primary action has been sent to the data subject and the request is delayed until the secondary action is executed */
  Delayed: 'DELAYED',
  /** The request has been approved and sent to the data subject with no secondary action */
  Completed: 'COMPLETED',
  /** The request is in a state where the data subject report zip can be downloaded. This is typically a completed ACCESS request */
  Downloadable: 'DOWNLOADABLE',
  /** The request is completed but not available for download, but its data categories are visible on the Privacy Center */
  ViewCategories: 'VIEW_CATEGORIES',
  /** The request was canceled and the data subject was notified */
  Canceled: 'CANCELED',
  /** The secondary request action begins compiling across the organization's Connected Services, i.e. erasure is actually called */
  Secondary: 'SECONDARY',
  /** The secondary request action completed compilation */
  SecondaryCompleted: 'SECONDARY_COMPLETED',
  /** The request is pending approval before final deletion request email is sent to the data subject */
  SecondaryApproving: 'SECONDARY_APPROVING',
  /** The request was revoked because it was a duplicate (another open request covers it) */
  Revoked: 'REVOKED',
});

/** Type override */
export type RequestStatus = (typeof RequestStatus)[keyof typeof RequestStatus];

/**
 * The places a DSR can originate from
 */
export enum RequestOrigin {
  /** Submit through the form on the privacy center */
  PrivacyCenter = 'PRIVACY_CENTER',
  /** Administrator made the request from the admin dashboard */
  AdminDashboard = 'ADMIN_DASHBOARD',
  /** Programmatic through the API */
  Api = 'API',
  /** Request made from Shopify Webhook */
  Shopify = 'SHOPIFY',
}

/**
 * The statuses that a queue is expected to implement
 */
export const QueueStatus = makeEnum({
  /** The row is queued up to be processed by the service worker. */
  Queued: 'QUEUED',
  /**
   * The service worker has fired and is waiting on an asynchronous response.
   * If waiting for too long, the item should be retried
   */
  Waiting: 'WAITING',
  /**
   * The processing was skipped because the record was no longer found.
   * The information may have been deleted already by another process.
   *
   * If a data silo is consistently skipping operations, there may be a deeper issue.
   */
  Skipped: 'SKIPPED',
  /** An error occurred while processing the row. The error message is stored on the model. */
  Error: 'ERROR',
  /** The service worker successfully processed the row. */
  Resolved: 'RESOLVED',
  /** The item requires attention for some reason */
  ActionRequired: 'ACTION_REQUIRED',
  /**
   * The Item has been successfully ingested by our SQS task queue,
   * and is currently in line to being processed.
   */
  RemoteProcessing: 'REMOTE_PROCESSING',
});

/**
 * Overload type
 */
export type QueueStatus = (typeof QueueStatus)[keyof typeof QueueStatus];

/**
 * Status of request/data-silo combo
 */
export const RequestDataSiloStatus = makeEnum({
  ...QueueStatus,
  /** The request not processed due to some exception */
  SkippedDueToException: 'SKIPPED_DUE_TO_EXCEPTION',
});

/**
 * Overload type
 */
export type RequestDataSiloStatus =
  (typeof RequestDataSiloStatus)[keyof typeof RequestDataSiloStatus];

/**
 * The request enrichers are a standard queue.
 */
export const RequestEnricherStatus = makeEnum({
  ...QueueStatus,
  /** Waiting on dependencies  in the enrichment step to finish running */
  WaitingOnDependencies: 'WAITING_ON_DEPENDENCIES',
  /** Polling for result */
  Polling: 'POLLING',
});

/**
 * Overload type
 */
export type RequestEnricherStatus =
  (typeof RequestEnricherStatus)[keyof typeof RequestEnricherStatus];

/**
 * The different ways that regions can be detected at time of
 * request submit.
 */
export const RegionDetectionMethod = makeEnum({
  /** Region detection is disabled */
  Disabled: 'DISABLED',
  /** Auto detect the region and collect in form silently */
  Auto: 'AUTO',
  /** Collect information about the user's region by presenting the user a form */
  Form: 'FORM',
});

/** Type override */
export type RegionDetectionMethod =
  (typeof RegionDetectionMethod)[keyof typeof RegionDetectionMethod];
