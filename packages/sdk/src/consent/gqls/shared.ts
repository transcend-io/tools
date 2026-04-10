/** Service associated with a cookie or data flow */
export interface TranscendCookieServiceGql {
  /** Service ID */
  id: string;
  /** Human-readable service title */
  title: string;
  /** Integration slug */
  integrationName: string;
}

/** Service fields shared by cookies and data flows */
export const SERVICE_FIELDS = `
  id
  title
  integrationName
`;

/** Tracking purpose assigned to a cookie or data flow */
export interface TranscendTrackingPurposeGql {
  /** Purpose ID */
  id: string;
  /** Purpose display name */
  name: string;
  /** Purpose slug (e.g. "Advertising", "Analytics") */
  trackingType: string;
}

/** Tracking purpose fields */
export const TRACKING_PURPOSE_FIELDS = `
  id
  name
  trackingType
`;
