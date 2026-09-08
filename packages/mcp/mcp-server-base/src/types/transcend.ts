/**
 * Transcend MCP Server - Shared Type Definitions
 */

// Common Types
export interface PaginationInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string;
  endCursor?: string;
  totalCount?: number;
}

export interface PaginatedResponse<T> {
  nodes: T[];
  pageInfo: PaginationInfo;
  totalCount?: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface MutationResponse<T> {
  clientMutationId?: string;
  data: T;
}

// DSR Automation Types
export type RequestType =
  | 'ACCESS'
  | 'ERASURE'
  | 'RECTIFICATION'
  | 'RESTRICTION'
  | 'SALE_OPT_OUT'
  | 'SALE_OPT_IN'
  | 'CONTACT_OPT_OUT'
  | 'CONTACT_OPT_IN'
  | 'AUTOMATED_DECISION_MAKING_OPT_OUT'
  | 'AUTOMATED_DECISION_MAKING_OPT_IN'
  | 'USE_OF_SENSITIVE_INFORMATION_OPT_OUT'
  | 'USE_OF_SENSITIVE_INFORMATION_OPT_IN'
  | 'TRACKING_OPT_OUT'
  | 'TRACKING_OPT_IN'
  | 'CUSTOM_OPT_OUT'
  | 'CUSTOM_OPT_IN'
  | 'BUSINESS_PURPOSE'
  | 'PLACE_ON_LEGAL_HOLD'
  | 'REMOVE_FROM_LEGAL_HOLD';

export type RequestStatus =
  | 'REQUEST_MADE'
  | 'FAILED_VERIFICATION'
  | 'ENRICHING'
  | 'ON_HOLD'
  | 'WAITING'
  | 'COMPILING'
  | 'APPROVING'
  | 'DELAYED'
  | 'COMPLETED'
  | 'DOWNLOADABLE'
  | 'VIEW_CATEGORIES'
  | 'CANCELED'
  | 'SECONDARY'
  | 'SECONDARY_COMPLETED'
  | 'SECONDARY_APPROVING'
  | 'REVOKED';

export interface Subject {
  id: string;
  email?: string;
  name?: string;
  coreIdentifier?: string;
}

export interface Request {
  id: string;
  type: RequestType;
  status: RequestStatus;
  subject?: Subject;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  daysRemaining?: number;
  link?: string;
  /** Users assigned to this request (request owners / approval assignees) */
  owners?: InventoryUserPreview[];
  /** Teams assigned to this request */
  teams?: InventoryTeamPreview[];
}

/** Nested enricher definition on a request-enricher job */
export interface RequestEnricherEnricher {
  /** Enricher UUID — pass as `enricherId` / `x-transcend-enricher-id` */
  id: string;
  /** Display title */
  title: string;
  /** Enricher type (e.g. SOMBRA, PERSON) */
  type: string;
}

/** Enricher job attached to a privacy request (preflight / enrichment stage) */
export interface RequestEnricherSummary {
  /** Status of this enricher job on the request (e.g. ENRICHING, RESOLVED, ERROR) */
  status: string;
  /** Enricher definition; use `enricher.id` as `enricherId` for `dsr_enrich_identifiers` */
  enricher: RequestEnricherEnricher;
}

export interface RequestDetails extends Request {
  dataSubjectType?: string;
  locale?: string;
  isSilent?: boolean;
  emailIsVerified?: boolean;
  requestIdentifiers?: RequestIdentifier[];
  requestDataSilos?: RequestDataSilo[];
  requestFiles?: RequestFile[];
  /** Enricher jobs for this request (for discovering enricherId without a nonce) */
  requestEnrichers?: RequestEnricherSummary[];
}

export interface RequestIdentifier {
  id: string;
  name: string;
  value: string;
  type: string;
  isVerified: boolean;
}

/** Nested data silo preview on a request–data-silo job, including owners */
export interface RequestDataSiloDataSilo {
  /** Data silo ID */
  id: string;
  /** Display title */
  title: string;
  /** Integration / silo type */
  type: string;
  /** Catalog outer type when present */
  outerType?: string;
  /** Whether the silo is live */
  isLive?: boolean;
  /** Individual system owners */
  owners?: InventoryUserPreview[];
  /** Owner teams */
  teams?: InventoryTeamPreview[];
}

export interface RequestDataSilo {
  /** Request–data-silo job ID */
  id: string;
  /** Nested data silo (system) with owners when selected */
  dataSilo: RequestDataSiloDataSilo;
  /** Visual status of the job (e.g. ERROR, RESOLVED, WAITING) */
  status: string;
  /** Error message when the job failed */
  error?: string;
  /** Operator notes on this job */
  details?: string;
  /** Admin dashboard deep link */
  link?: string;
}

export interface RequestFile {
  id: string;
  fileName: string;
  fileSize: number;
  createdAt: string;
  downloadUrl?: string;
}

export interface DSRSubmission {
  /**
   * Published workflow config UUID (Privacy Requests → Workflows).
   * Request type and subject class are derived from this config.
   */
  workflowConfigId: string;
  /** Email address of the data subject (required when not silent) */
  email: string;
  /** Core identifier; defaults to email when omitted */
  coreIdentifier?: string;
  /** Locale for communications (e.g. en-US) */
  locale?: string;
  /** When true, suppress email notifications to the data subject */
  isSilent?: boolean;
}

export interface DSRResponse {
  /** Privacy request ID */
  id: string;
  /** Request status */
  status: string;
  /** Optional server message */
  message?: string;
  /** Optional nonce */
  nonce?: string;
  /** Request action derived from the workflow config */
  type?: string;
  /** Data subject class derived from the workflow config */
  subjectType?: string;
  /** Subject email on the created request */
  email?: string | null;
  /** Core identifier on the created request */
  coreIdentifier?: string;
  /** Admin dashboard deep link */
  link?: string;
}

/**
 * Minimal summary of a request returned from bulk DSR create.
 */
export interface DSRCreatedSummary {
  /** Privacy request ID */
  id: string;
  /** Request status */
  status: string;
  /** Request action derived from the workflow config */
  type?: string;
  /** Data subject class derived from the workflow config */
  subjectType?: string;
  /** Admin dashboard deep link */
  link?: string;
}

export interface DownloadKey {
  key: string;
  expiresAt: string;
}

export interface EnrichIdentifiersInput {
  /** JWT nonce from webhook or pending-requests (preferred) */
  nonce?: string;
  /** Request ID for manual enrichment when nonce is unavailable */
  requestId?: string;
  /** Enricher ID for manual enrichment when nonce is unavailable */
  enricherId?: string;
  /** Identifier names and values to add */
  identifiers: Record<string, string>;
}

export interface AccessResponseInput {
  /** JWT nonce from webhook or pending-requests */
  nonce: string;
  /** Profile data to return for the access request */
  profiles?: { profileId?: string; profileData?: unknown }[];
}

export interface ErasureResponseInput {
  /** JWT nonce from webhook or pending-requests */
  nonce: string;
  /** Profile IDs that were erased */
  profileIds?: string[];
}

// Consent Management Types
export type ConsentPurpose =
  | 'Essential'
  | 'Analytics'
  | 'Advertising'
  | 'Functional'
  | 'SaleOfInfo';

export type ConsentValue = boolean | 'NOTSET';

export interface ConsentPreference {
  purpose: string;
  enabled: ConsentValue;
  timestamp?: string;
}

export interface UserPreferences {
  userId?: string;
  partition: string;
  purposes: ConsentPreference[];
  identifier?: string;
  identifierType?: string;
  timestamp?: string;
  confirmed?: boolean;
}

export interface PreferenceStoreIdentifier {
  /** Identifier name (e.g. email, phone) */
  name: string;
  /** Identifier value */
  value: string;
}

export interface PreferenceQueryInput {
  /** Preference store partition key */
  partition: string;
  /** Identifiers to query */
  identifiers: {
    /** Identifier value */
    value: string;
    /** Identifier name (optional; inferred when omitted) */
    name?: string;
  }[];
  /** Max records per page (1–50) */
  limit?: number;
  /** Pagination cursor from a previous query */
  cursor?: string;
}

export interface PreferenceQueryResult {
  /** Matching preference records */
  nodes: unknown[];
  /** Cursor for the next page, if any */
  cursor?: string;
}

export interface PreferenceUpsertRecord {
  /** Partition key for this record */
  partition: string;
  /** ISO 8601 timestamp for the consent update */
  timestamp: string;
  /** Whether consent was explicitly confirmed */
  confirmed?: boolean;
  /** User identifiers */
  identifiers?: PreferenceStoreIdentifier[];
  /** Legacy user ID (prefer identifiers) */
  userId?: string;
  /** Purpose consent updates */
  purposes: {
    /** Purpose slug */
    purpose: string;
    /** Whether the purpose is enabled (Preference Store wire field) */
    enabled: boolean;
    /** ISO 8601 timestamp for this purpose */
    timestamp?: string;
  }[];
}

export interface PreferenceUpsertInput {
  /** Records to upsert */
  records: PreferenceUpsertRecord[];
  /** When true, skip workflow triggers */
  skipWorkflowTriggers?: boolean;
}

export interface PreferenceDeleteRecordInput {
  /** Anchor identifier locating the record */
  anchorIdentifier: PreferenceStoreIdentifier;
  /** ISO 8601 timestamp for the deletion */
  timestamp: string;
}

export interface PreferenceAppendIdentifierRecordInput {
  /** Anchor identifier locating the record */
  anchorIdentifier: PreferenceStoreIdentifier;
  /** Identifier to append */
  append: PreferenceStoreIdentifier;
  /** ISO 8601 timestamp for the update */
  timestamp: string;
  /** Optional operation flags */
  options?: {
    /** Merge records when append value conflicts */
    mergeRecordsOnConflict?: boolean;
    /** Return remaining identifiers in the response */
    returnIdentifiers?: boolean;
  };
}

export interface PreferenceUpdateIdentifierRecordInput {
  /** Anchor identifier locating the record */
  anchorIdentifier: PreferenceStoreIdentifier;
  /** Identifier update details */
  update: {
    /** Identifier name */
    name: string;
    /** Current identifier value */
    oldValue: string;
    /** New identifier value */
    newValue: string;
  };
  /** ISO 8601 timestamp for the update */
  timestamp: string;
  /** Optional operation flags */
  options?: {
    /** Merge records when update value conflicts */
    mergeRecordsOnConflict?: boolean;
    /** Return remaining identifiers in the response */
    returnIdentifiers?: boolean;
  };
}

export interface PreferenceDeleteIdentifierRecordInput {
  /** Anchor identifier locating the record */
  anchorIdentifier: PreferenceStoreIdentifier;
  /** Identifier to delete */
  delete: PreferenceStoreIdentifier;
  /** ISO 8601 timestamp for the update */
  timestamp: string;
  /** Optional operation flags */
  options?: {
    /** Return remaining identifiers in the response */
    returnIdentifiers?: boolean;
  };
}

export interface PreferenceIdentifiersResponse {
  /** Overall success when the API includes it */
  success?: boolean;
  /** Per-record operation results */
  records: {
    /** Whether the operation succeeded */
    success: boolean;
    /** Remaining identifiers when requested */
    identifiers?: PreferenceStoreIdentifier[];
    /** Error message when success is false */
    errorMessage?: string;
  }[];
  /** Index-aligned failures */
  failures?: { index: number; error: string }[];
  /** Schema / batch validation errors */
  errors?: unknown[];
}

export interface PreferenceUpsertResponse {
  /** Overall success flag from Preference Store */
  success?: boolean;
  /** Successfully written records */
  nodes?: unknown[];
  /** Index-aligned failures */
  failures?: { index: number; error: string }[];
  /** Schema / batch validation errors */
  errors?: unknown[];
}

export interface AirgapBundle {
  id: string;
  name: string;
  version: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  config?: Record<string, unknown>;
}

export interface TrackingPurpose {
  id: string;
  name: string;
  trackingType: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DataFlow {
  id: string;
  name: string;
  type: string;
  service?: string;
  trackingPurposes?: TrackingPurpose[];
  status: string;
  createdAt: string;
}

export type ConsentTrackerStatus = 'LIVE' | 'NEEDS_REVIEW';
export type ConsentTrackerSource = 'MANUAL' | 'SCAN' | 'TELEMETRY';
export type DataFlowScope = 'HOST' | 'PATH' | 'QUERY_PARAM' | 'REGEX' | 'CSP';

export interface CookieService {
  id: string;
  title: string;
  integrationName?: string;
}

export interface Cookie {
  id: string;
  name: string;
  description?: string;
  trackingPurposes: string[];
  purposes: TrackingPurpose[];
  frequency: number;
  service?: CookieService;
  isJunk: boolean;
  isRegex: boolean;
  source: ConsentTrackerSource;
  status: ConsentTrackerStatus;
  createdAt: string;
  updatedAt: string;
  lastDiscoveredAt?: string;
  domains: string[];
  occurrences: number;
  consentSiteCountAllTime: number;
  consentSiteCountLastWeek: number;
}

export interface ConsentDataFlow {
  id: string;
  value: string;
  description?: string;
  type: DataFlowScope;
  trackingType: string[];
  purposes: TrackingPurpose[];
  frequency: number;
  service?: CookieService;
  isJunk: boolean;
  source: ConsentTrackerSource;
  status: ConsentTrackerStatus;
  createdAt: string;
  updatedAt: string;
  lastDiscoveredAt?: string;
  occurrences: number;
  consentSiteCountAllTime: number;
  consentSiteCountLastWeek: number;
}

export interface CookieStats {
  total: number;
  live: number;
  needsReview: number;
  junk: number;
}

export interface UpdateCookieInput {
  name: string;
  trackingPurposes?: string[];
  purposeIds?: string[];
  description?: string;
  service?: string;
  isJunk?: boolean;
  status?: ConsentTrackerStatus;
  isRegex?: boolean;
  source?: ConsentTrackerSource;
}

export interface UpdateConsentDataFlowInput {
  id: string;
  value?: string;
  type?: DataFlowScope;
  trackingType?: string[];
  purposeIds?: string[];
  description?: string;
  service?: string;
  isJunk?: boolean;
  status?: ConsentTrackerStatus;
}

export interface PrivacyRegime {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
}

export interface ConsentTelemetry {
  date: string;
  optIns: number;
  optOuts: number;
  total: number;
  byPurpose?: Record<string, { optIn: number; optOut: number }>;
}

// Data Inventory Types
export type DataSiloType = 'server' | 'database' | 'api' | 'cookie' | 'sombra';

export interface DataSilo {
  id: string;
  title: string;
  type: DataSiloType;
  description?: string;
  link?: string;
  isLive: boolean;
  outerType?: string;
  catalog?: DataCatalog;
  createdAt: string;
  updatedAt?: string;
}

/** Lightweight owner preview on inventory resources */
export interface InventoryUserPreview {
  /** User ID */
  id: string;
  /** Email address */
  email: string;
  /** Display name */
  name?: string;
}

/** Lightweight team preview on inventory resources */
export interface InventoryTeamPreview {
  /** Team ID */
  id: string;
  /** Team name */
  name: string;
}

/** Business entity row for inventory list / silo association */
export interface BusinessEntity {
  /** Unique identifier */
  id: string;
  /** Display title (use with inventory_write_data_silo `businessEntityTitles`) */
  title: string;
  /** Description */
  description?: string;
}

/** Data subject row for inventory list / silo blocklist resolution */
export interface DataSubject {
  /** Unique identifier (use with inventory_write_data_silo `dataSubjectBlockListIds`) */
  id: string;
  /** Machine type key (e.g. CUSTOMER, EMPLOYEE) */
  type: string;
  /** Display title */
  title?: string;
  /** Whether the subject type is active */
  active?: boolean;
}

export interface DataSiloDetails extends DataSilo {
  /** Free-form notes */
  notes?: string;
  /** Primary contact name */
  contactName?: string;
  /** Primary contact email */
  contactEmail?: string;
  /** Website URL */
  websiteUrl?: string;
  /** ISO country code */
  country?: string;
  /** ISO country subdivision */
  countrySubDivision?: string;
  /** Linked vendor from the Vendors table */
  vendor?: Pick<
    Vendor,
    | 'id'
    | 'title'
    | 'description'
    | 'contactName'
    | 'contactEmail'
    | 'websiteUrl'
    | 'dataProcessingAgreementLink'
  >;
  /** Silo-level purpose of processing assignments */
  processingPurposeSubCategories?: DataPurpose[];
  /** Owner users */
  owners?: InventoryUserPreview[];
  /** Owner teams */
  teams?: InventoryTeamPreview[];
  /** Linked business entities */
  businessEntities?: BusinessEntity[];
  /** Associated / allowlisted data subjects */
  subjects?: DataSubject[];
  /** Blocked data subjects (maps from GraphQL `subjectBlocklist`) */
  subjectBlocklist?: DataSubject[];
  /** Nested datapoints (optional; prefer inventory_list_data_points with dataSiloId) */
  dataPoints?: DataPoint[];
  /** Connected identifiers */
  identifiers?: Identifier[];
  /** Dependent data silos */
  dependentDataSilos?: DataSilo[];
}

export interface DataSiloCreateInput {
  /** Catalog integration name (GraphQL `name`), e.g. "server", "Salesforce" */
  name: string;
  /** Display title for the data system */
  title?: string;
  /** Description for the data system */
  description?: string;
  pluginId?: string;
  resourceId?: string;
  region?: string;
  country?: string;
  countrySubDivision?: string;
}

export interface DataSiloUpdateInput {
  /** Data silo ID */
  id: string;
  /** Display title */
  title?: string;
  /** Description */
  description?: string;
  /** Notification email for DSR automation */
  notifyEmailAddress?: string;
  /** Webhook URL for DSR automation */
  notifyWebhookUrl?: string;
  /** Include identifiers attachment on prompt-a-vendor emails */
  promptAVendorEmailIncludeIdentifiersAttachment?: boolean;
  /** Owner email addresses */
  ownerEmails?: string[];
  /** Team names */
  teamNames?: string[];
  /** Linked vendor ID */
  vendorId?: string;
  /** Processing purpose subcategory IDs (silo-level purpose of processing) */
  processingPurposeSubCategoryIds?: string[];
  /**
   * Data subject IDs to place on the blocklist (subjects that should *not*
   * apply to this system). Resolve IDs via inventory_list_data_subjects.
   */
  dataSubjectBlockListIds?: string[];
  /** ISO country code */
  country?: string;
  /** ISO country subdivision */
  countrySubDivision?: string;
  /** Vendor / system website URL */
  websiteUrl?: string;
  /** Primary contact name */
  contactName?: string;
  /** Primary contact email */
  contactEmail?: string;
  /** Free-form notes */
  notes?: string;
  /** Business entity titles */
  businessEntityTitles?: string[];
  /** Whether the data silo is live for DSR processing */
  isLive?: boolean;
}

export interface DataSiloWriteInput extends Omit<DataSiloUpdateInput, 'id'> {
  /** Existing data silo ID (update path when set) */
  id?: string;
  /** Catalog integration name (GraphQL `name`) required to create when id is omitted */
  integrationName?: string;
}

export interface DataPoint {
  /** Unique identifier */
  id: string;
  /** Datapoint key / name */
  name: string;
  /** Parent data silo ID when returned from list/filter queries */
  dataSiloId?: string;
  /** Display title */
  title?: string;
  /** Description */
  description?: string;
  /** Nested path segments */
  path?: string[];
  /** Parent data collection */
  dataCollection?: DataCollection;
  /** Field-level sub-data points */
  subDataPoints?: SubDataPoint[];
  /** Assigned data categories */
  categories?: DataCategory[];
}

export interface SubDataPoint {
  /** Unique identifier */
  id: string;
  /** Field name */
  name: string;
  /** Field description */
  description?: string;
  /** Assigned data categories */
  categories?: DataCategory[];
  /** Purpose of processing assignments */
  purposes?: DataPurpose[];
  /** Whether the field is visible in access requests */
  accessRequestVisibilityEnabled?: boolean;
}

export interface DataCategory {
  /** Unique identifier (may be empty for category catalog rows without an id) */
  id: string;
  /** Subcategory display name */
  name: string;
  /** Top-level data category type */
  category: string;
  /** Description */
  description?: string;
  /** Optional classification regex */
  regex?: string;
  /** Owner email addresses */
  ownerEmails?: string[];
  /** Owner team names */
  teamNames?: string[];
}

export interface DataPurpose {
  /** Unique identifier */
  id: string;
  /** Subcategory display name (e.g. "Other", "Login") */
  name: string;
  /** Processing purpose enum value (e.g. "ESSENTIAL", "ANALYTICS") */
  purpose: string;
  /** Description */
  description?: string;
}

export interface DataCollection {
  id: string;
  title: string;
  description?: string;
  dataPoints?: DataPoint[];
}

export interface DataCatalog {
  id: string;
  title: string;
  description?: string;
  integrations?: DataSilo[];
}

/**
 * Integration catalog entry from GraphQL `catalogs`.
 * Pass `integrationName` to `inventory_write_data_silo`.
 */
export interface CatalogIntegration {
  /** Catalog slug for createDataSilos (`name`) */
  integrationName: string;
  /** Display title */
  title: string;
  /** Catalog description */
  description?: string;
  /** Whether the integration supports API-based DSRs */
  hasApiFunctionality: boolean;
  /** Whether the integration supports Advise Vendor Communications */
  hasAvcFunctionality: boolean;
  /** Count of already-connected instances of this integration in the org */
  alreadyConnected: number;
  /** High-level integration category enum value, when set */
  integrationCategory?: string;
}

export interface Identifier {
  id: string;
  name: string;
  type: string;
  regex?: string;
  isRequiredInForm?: boolean;
  isVerifiedAtIngest?: boolean;
  selectOptions?: string[];
  prompt?: string;
}

export interface DataPointSubDataPointInput {
  /** Field name / key */
  name: string;
  /** Field description */
  description?: string;
  /** Purpose of processing assignments */
  purposes?: {
    /** Processing purpose enum value */
    purpose: string;
    /** Subcategory name (defaults to "Other") */
    name: string;
  }[];
  /** Data category assignments */
  categories?: {
    /** Top-level data category type */
    category: string;
    /** Subcategory name */
    name: string;
  }[];
}

export interface DataPointUpdateOrCreateInput {
  /** Parent data silo ID */
  dataSiloId: string;
  /** Datapoint key / name (upsert key) */
  name: string;
  /** Display title */
  title?: string;
  /** Description */
  description?: string;
  /** Owner email addresses */
  ownerEmails?: string[];
  /** Team names */
  teamNames?: string[];
  /** Nested path segments */
  path?: string[];
  /** Field-level sub-data points (including purpose assignments) */
  subDataPoints?: DataPointSubDataPointInput[];
}

export interface ProcessingPurposeCreateInput {
  /** Subcategory display name */
  name: string;
  /** Processing purpose enum value */
  purpose: string;
  /** Description */
  description?: string;
}

export interface ProcessingPurposeUpdateInput {
  /** Processing purpose subcategory ID */
  id: string;
  /** Subcategory display name */
  name?: string;
  /** Processing purpose enum value */
  purpose?: string;
  /** Description */
  description?: string;
}

export interface ProcessingPurposeWriteInput {
  /** Existing processing purpose subcategory ID (update path when set) */
  id?: string;
  /** Subcategory display name (upsert key with purpose when id is omitted) */
  name?: string;
  /** Processing purpose enum value (upsert key with name when id is omitted) */
  purpose?: string;
  /** Description */
  description?: string;
}

export interface DataCategoryCreateInput {
  /** Subcategory display name */
  name: string;
  /** Top-level data category type */
  category: string;
  /** Description */
  description?: string;
  /** Owner email addresses */
  ownerEmails?: string[];
  /** Owner team names */
  teamNames?: string[];
}

export interface DataCategoryUpdateInput {
  /** Data subcategory ID */
  id: string;
  /** Description */
  description?: string;
  /** Owner email addresses */
  ownerEmails?: string[];
  /** Owner team names */
  teamNames?: string[];
}

export interface DataCategoryWriteInput {
  /** Existing data subcategory ID (update path when set) */
  id?: string;
  /** Subcategory display name (upsert key with category when id is omitted) */
  name?: string;
  /** Top-level data category type (upsert key with name when id is omitted) */
  category?: string;
  /** Description */
  description?: string;
  /** Owner email addresses */
  ownerEmails?: string[];
  /** Owner team names */
  teamNames?: string[];
}

export interface VendorCreateInput {
  /** Vendor display title */
  title: string;
  /** Description (required by GraphQL; empty string allowed) */
  description: string;
  /** DPA link */
  dataProcessingAgreementLink?: string;
  /** Primary contact name */
  contactName?: string;
  /** Primary contact email */
  contactEmail?: string;
  /** Primary contact phone */
  contactPhone?: string;
  /** Website URL */
  websiteUrl?: string;
  /** Physical address */
  address?: string;
  /** Headquarters ISO country code */
  headquarterCountry?: string;
  /** Headquarters country subdivision */
  headquarterSubDivision?: string;
}

export interface VendorUpdateInput {
  /** Vendor ID */
  id: string;
  /** Vendor display title */
  title?: string;
  /** Description */
  description?: string;
  /** DPA link */
  dataProcessingAgreementLink?: string;
  /** Primary contact name */
  contactName?: string;
  /** Primary contact email */
  contactEmail?: string;
  /** Primary contact phone */
  contactPhone?: string;
  /** Website URL */
  websiteUrl?: string;
  /** Physical address */
  address?: string;
  /** Headquarters ISO country code */
  headquarterCountry?: string;
  /** Headquarters country subdivision */
  headquarterSubDivision?: string;
}

export interface VendorWriteInput {
  /** Existing vendor ID (update path when set) */
  id?: string;
  /** Vendor display title (upsert key when id is omitted; required to create) */
  title?: string;
  /** Description */
  description?: string;
  /** DPA link */
  dataProcessingAgreementLink?: string;
  /** Primary contact name */
  contactName?: string;
  /** Primary contact email */
  contactEmail?: string;
  /** Primary contact phone */
  contactPhone?: string;
  /** Website URL */
  websiteUrl?: string;
  /** Physical address */
  address?: string;
  /** Headquarters ISO country code */
  headquarterCountry?: string;
  /** Headquarters country subdivision */
  headquarterSubDivision?: string;
}

export interface Vendor {
  /** Unique identifier */
  id: string;
  /** Display title */
  title: string;
  /** Description */
  description?: string;
  /** DPA link */
  dataProcessingAgreementLink?: string;
  /** Privacy policy link */
  privacyPolicyLink?: string;
  /** Primary contact name */
  contactName?: string;
  /** Primary contact email */
  contactEmail?: string;
  /** Primary contact phone */
  contactPhone?: string;
  /** Website URL */
  websiteUrl?: string;
  /** Physical address */
  address?: string;
  /** Headquarters ISO country code */
  headquarterCountry?: string;
  /** Headquarters country subdivision */
  headquarterSubDivision?: string;
  /** Associated data silos */
  dataSilos?: DataSilo[];
  /** Created timestamp (ISO 8601) when returned by the API */
  createdAt?: string;
  /** Updated timestamp (ISO 8601) */
  updatedAt?: string;
}

// Data Discovery & Classification Types
export interface ClassificationScan {
  id: string;
  name: string;
  type: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
  dataSiloId?: string;
  results?: ClassificationResult[];
  createdAt: string;
}

export interface ClassificationResult {
  id: string;
  path: string;
  dataCategory?: DataCategory;
  confidence: number;
  sampleData?: string;
}

export interface DiscoveryPlugin {
  id: string;
  name: string;
  type: string;
  description?: string;
  isEnabled: boolean;
  config?: Record<string, unknown>;
}

export interface LLMClassificationInput {
  /** Text strings to classify */
  texts: string[];
  /** Category labels to classify against */
  categories: string[];
  /** LLM model type override */
  model?: string;
}

export interface LLMClassificationResult {
  /** Input text that was classified */
  text: string;
  /** Classification guesses for this text */
  classifications: {
    /** Predicted category label */
    category: string;
    /** Confidence score (0–1); derived from confidenceLabel when only ordinals are returned */
    confidence: number;
    /** Parent category when available */
    subcategory?: string;
    /** Ordinal confidence from the classifier when present (HIGH / MEDIUM / LOW) */
    confidenceLabel?: string;
  }[];
}

export interface NERExtractionInput {
  /** Text to extract entities from */
  text: string;
  /** Entity type labels to extract */
  entityTypes: string[];
}

export interface NERExtractionResult {
  /** Extracted entities */
  entities: {
    /** Extracted entity value */
    text: string;
    /** Entity type label */
    type: string;
    /** Confidence score */
    confidence: number;
    /** Source text snippet when available */
    snippet?: string;
  }[];
}

export interface PendingRequestItem {
  /** Pending identifier value */
  identifier: string;
  /** Identifier type */
  type: string;
  /** Core identifier for the request */
  coreIdentifier: string;
  /** Data silo ID */
  dataSiloId: string;
  /** Privacy request ID */
  requestId: string;
  /** JWT nonce for responding to this pending item */
  nonce: string;
}

// Assessment Types
export type AssessmentFormStatus =
  | 'DRAFT'
  | 'SHARED'
  | 'IN_PROGRESS'
  | 'IN_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'REJECTED'
  | 'APPROVED';

/** @deprecated Use AssessmentFormStatus */
export type AssessmentStatus = AssessmentFormStatus;

export interface Assessment {
  /** Unique identifier */
  id: string;
  /** Display title */
  title: string;
  /** Optional description */
  description?: string;
  /** Lifecycle status */
  status: AssessmentStatus;
  /**
   * ID of the assessment group this form belongs to. Available on responses
   * from {@link AssessmentsMixin.createAssessment}, `getAssessment`, and
   * `listAssessments` so callers can build deep links to the group view.
   */
  assessmentGroupId?: string;
  /** Source template, when expanded */
  template?: AssessmentTemplate;
  /** Primary assignee */
  assignee?: User;
  /** Reviewer */
  reviewer?: User;
  /** Optional due date (ISO 8601) */
  dueDate?: string;
  /** When the form was submitted for review (ISO 8601) */
  submittedAt?: string;
  /** When the form was fully completed (ISO 8601) */
  completedAt?: string;
  /** Sections in the form */
  sections?: AssessmentSection[];
  /** When the form was created (ISO 8601) */
  createdAt: string;
  /** When the form was last updated (ISO 8601) */
  updatedAt?: string;
}

export interface AssessmentTemplate {
  id: string;
  title: string;
  description?: string;
  version: string;
  sections?: AssessmentTemplateSection[];
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface AssessmentTemplateSection {
  id: string;
  title: string;
  description?: string;
  order: number;
  questions: AssessmentFormQuestion[];
}

export interface AssessmentSection {
  id: string;
  title?: string;
  index?: number;
  status?: string;
  templateSection?: AssessmentTemplateSection;
  responses?: AssessmentResponse[];
  isComplete?: boolean;
  questions?: AssessmentFormQuestion[];
}

export interface AssessmentFormQuestion {
  id: string;
  title?: string;
  index?: number;
  type: string;
  subType?: string;
  description?: string;
  isRequired?: boolean;
  placeholder?: string;
  referenceId?: string;
  answerOptions?: AssessmentAnswerOption[];
  selectedAnswers?: AssessmentAnswerOption[];
}

export interface AssessmentAnswerOption {
  id: string;
  index?: number;
  value: string;
}

/** @deprecated Use AssessmentFormQuestion instead */
export interface AssessmentQuestion {
  id: string;
  text: string;
  description?: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'boolean' | 'date' | 'file';
  isRequired: boolean;
  options?: string[];
  validation?: Record<string, unknown>;
}

export interface AssessmentResponse {
  id: string;
  questionId: string;
  value: unknown;
  files?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface AssessmentGroup {
  id: string;
  title: string;
  assessmentFormTemplate?: {
    id: string;
    title: string;
  };
}

export interface AssessmentCreateInput {
  title: string;
  assessmentGroupId: string;
  assigneeIds?: string[];
}

export interface AssessmentUpdateInput {
  id: string;
  title?: string;
  description?: string;
  status?: AssessmentStatus;
  reviewerIds?: string[];
  isArchived?: boolean;
  dueDate?: string;
  sendNotification?: boolean;
  comment?: string;
  sectionIdsToNotify?: string[];
}

export interface AssessmentSubmitForReviewInput {
  id: string;
  assessmentSectionIds: string[];
}

export interface AssessmentTemplateCreateInput {
  title: string;
  description?: string;
  status?: 'DRAFT' | 'PUBLISHED';
  sections?: AssessmentSectionInput[];
  source?: 'MANUAL' | 'DATA_INVENTORY' | 'IMPORT';
}

export interface AssessmentSectionInput {
  title: string;
  questions?: AssessmentQuestionInput[];
}

export interface AssessmentQuestionInput {
  title: string;
  type: 'LONG_ANSWER_TEXT' | 'SHORT_ANSWER_TEXT' | 'SINGLE_SELECT' | 'MULTI_SELECT' | 'FILE';
  subType?:
    | 'NONE'
    | 'CUSTOM'
    | 'USER'
    | 'TEAM'
    | 'DATA_SUB_CATEGORY'
    | 'HAS_PERSONAL_DATA'
    | 'ATTRIBUTE_KEY'
    | 'SENSITIVE_CATEGORY';
  placeholder?: string;
  description?: string;
  isRequired?: boolean;
  referenceId?: string;
  answerOptions?: { value: string }[];
  allowSelectOther?: boolean;
  requireRiskEvaluation?: boolean;
  riskLogic?: RiskLogicInput[];
  riskCategoryIds?: string[];
  riskFrameworkId?: string;
  displayLogic?: DisplayLogicInput;
}

export interface RiskLogicInput {
  riskLevel: string;
  answerOptionValues?: string[];
}

export interface DisplayLogicInput {
  operator: string;
  conditions: {
    referenceId: string;
    values: string[];
  }[];
}

export interface AssessmentTemplateExport {
  id: string;
  title: string;
  description: string;
  status: string;
  source: string;
  sections: AssessmentTemplateSectionExport[];
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentTemplateSectionExport {
  id: string;
  title: string;
  index: number;
  questions: AssessmentTemplateQuestionExport[];
}

export interface AssessmentTemplateQuestionExport {
  id: string;
  title: string;
  index: number;
  type: string;
  subType: string;
  description: string;
  placeholder: string;
  isRequired: boolean;
  referenceId: string;
  allowSelectOther: boolean;
  requireRiskEvaluation: boolean;
  answerOptions: { id: string; index: number; value: string }[];
}

export interface AssessmentPrefillInput {
  templateId?: string;
  assessmentGroupId?: string;
  title: string;
  answers: Record<string, string | string[]>;
  assigneeIds?: string[];
  assigneeEmails?: string[];
  reviewerIds?: string[];
  submitForReview?: boolean;
}

// Workflow Types
export interface Workflow {
  id: string;
  title: { defaultMessage: string };
  /** Dashboard internal name when present */
  internalName?: string;
  /** Visibility of the workflow config (e.g. published vs draft) */
  workflowConfigVisibility?: string;
  /** DSR action type derived from the workflow (e.g. ACCESS, ERASURE) */
  actionType?: string;
  /** Data subject class for the workflow (e.g. customer, employee) */
  subjectType?: string;
  type?: string;
  description?: string;
  isActive?: boolean;
  triggers?: WorkflowTrigger[];
  actions?: WorkflowAction[];
  config?: WorkflowConfig;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkflowTrigger {
  id: string;
  type: string;
  config?: Record<string, unknown>;
}

export interface WorkflowAction {
  id: string;
  type: string;
  order: number;
  config?: Record<string, unknown>;
}

export interface WorkflowConfig {
  id: string;
  title?: string;
  subtitle?: string;
  description?: string;
  showInPrivacyCenter?: boolean;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  type: string;
  locale?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

// Admin & Infrastructure Types
export interface Organization {
  id: string;
  name: string;
  uri: string;
  logoUrl?: string;
  privacyCenterUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  title?: string;
  role?: string;
  teams?: Team[];
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  members?: User[];
  dataSilos?: DataSilo[];
  createdAt: string;
  updatedAt?: string;
}

export interface ApiKeyScope {
  id: string;
  name: string;
}

export interface ApiKey {
  id: string;
  title: string;
  scopes: ApiKeyScope[];
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
  createdBy?: User;
}

export interface ApiKeyCreateInput {
  title: string;
  scopes: string[];
  dataSilos?: string[];
}

export interface PrivacyCenter {
  id: string;
  name: string;
  url: string;
  logoUrl?: string;
  primaryColor?: string;
  config?: Record<string, unknown>;
  locales?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

// Tool Response Types
export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface ListResult<T> extends ToolResult<T[]> {
  totalCount?: number;
  pageInfo?: PaginationInfo;
}

// Client Configuration Types
export interface ClientConfig {
  apiKey: string;
  sombraUrl?: string;
  graphqlUrl?: string;
  timeout?: number;
  retries?: number;
}

export interface RequestOptions {
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
}
