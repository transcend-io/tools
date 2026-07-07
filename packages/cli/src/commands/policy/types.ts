/** A policy bundle parent record. */
export interface PolicyBundle {
  /** Bundle UUID */
  id: string;
  /** Tenant-unique bundle name */
  bundleName: string;
  /** Human-readable description */
  description: string | null;
  /** Active version UUID, if any */
  activeVersionId: string | null;
  /** When a version was last activated */
  lastActivatedAt: string | null;
  /** When the bundle was created */
  createdAt: string;
  /** When the bundle was last updated */
  updatedAt: string;
}

/** An immutable policy bundle version. */
export interface PolicyBundleVersion {
  /** Version UUID */
  id: string;
  /** Caller-supplied version label */
  version: string;
  /** SHA-256 hex digest of compiled bundle bytes */
  sha256: string;
  /** Size of compiled bundle in bytes */
  sizeBytes: number;
  /** Human-readable description */
  description: string | null;
  /** Actor who uploaded the version */
  createdBy: string;
  /** When the version was activated, if ever */
  activatedAt: string | null;
  /** When the version was deactivated, if ever */
  deactivatedAt: string | null;
  /** When the version was uploaded */
  createdAt: string;
  /** When the version was last updated */
  updatedAt: string;
}

/** Offset-paginated list of policy bundles. */
export interface PolicyBundleListResponse {
  /** Bundles on this page */
  nodes: PolicyBundle[];
  /** Total bundles across all pages */
  totalCount: number;
}

/** Cursor metadata for version list pagination. */
export interface CursorPageInfo {
  /** Whether another forward page exists */
  hasNextPage: boolean;
  /** Whether another backward page exists */
  hasPreviousPage: boolean;
  /** Cursor of the first item on this page */
  startCursor?: string;
  /** Cursor of the last item on this page */
  endCursor?: string;
}

/** Cursor-paginated list of bundle versions. */
export interface PolicyBundleVersionListResponse {
  /** Versions on this page */
  nodes: PolicyBundleVersion[];
  /** Cursor pagination metadata */
  pageInfo: CursorPageInfo;
}

/** Response from creating a bundle and first version. */
export interface CreatePolicyBundleResponse {
  /** Created bundle */
  bundle: PolicyBundle;
  /** Created first version */
  version: PolicyBundleVersion;
}

/** Response from uploading a new version. */
export interface CreatePolicyBundleVersionResponse {
  /** Uploaded version */
  version: PolicyBundleVersion;
}

/** Response from activating a bundle version. */
export interface ActivatePolicyBundleVersionResponse {
  /** Updated bundle */
  bundle: PolicyBundle;
  /** Activated version */
  version: PolicyBundleVersion;
}

/** Response from deactivating a bundle's active version. */
export interface DeactivatePolicyBundleResponse {
  /** Updated bundle with `activeVersionId` cleared */
  bundle: PolicyBundle;
  /** Previously-active version, now stamped with `deactivatedAt` */
  version: PolicyBundleVersion;
}
