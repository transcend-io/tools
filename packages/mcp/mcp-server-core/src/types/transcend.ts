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
}

export interface RequestDetails extends Request {
  dataSubjectType?: string;
  locale?: string;
  isSilent?: boolean;
  emailIsVerified?: boolean;
  requestIdentifiers?: RequestIdentifier[];
  requestDataSilos?: RequestDataSilo[];
  requestFiles?: RequestFile[];
}

export interface RequestIdentifier {
  id: string;
  name: string;
  value: string;
  type: string;
  isVerified: boolean;
}

export interface RequestDataSilo {
  id: string;
  dataSilo: DataSilo;
  status: string;
  completedAt?: string;
}

export interface RequestFile {
  id: string;
  fileName: string;
  fileSize: number;
  createdAt: string;
  downloadUrl?: string;
}

export interface DSRSubmission {
  type: RequestType;
  email: string;
  coreIdentifier?: string;
  subjectType?: string;
  name?: string;
  phone?: string;
  locale?: string;
  isSilent?: boolean;
  skipSecondaryLookup?: boolean;
  additionalIdentifiers?: Record<string, string>;
}

export interface DSRResponse {
  id: string;
  status: string;
  message?: string;
  nonce?: string;
}

export interface DownloadKey {
  key: string;
  expiresAt: string;
}

export interface EnrichIdentifiersInput {
  requestId: string;
  identifiers: Record<string, string>;
}

export interface AccessResponseInput {
  requestId: string;
  dataSiloId: string;
  profiles?: Record<string, unknown>[];
  files?: {
    fileName: string;
    fileData: string;
  }[];
}

export interface ErasureResponseInput {
  requestId: string;
  dataSiloId: string;
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

export interface PreferenceQueryInput {
  partition: string;
  identifiers: {
    value: string;
    type?: string;
  }[];
}

export interface PreferenceUpsertInput {
  partition: string;
  records: {
    identifier: string;
    identifierType?: string;
    purposes: ConsentPreference[];
    confirmed?: boolean;
  }[];
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

export interface DataSiloDetails extends DataSilo {
  dataPoints?: DataPoint[];
  subjectBlocklist?: string[];
  identifiers?: Identifier[];
  dependentDataSilos?: DataSilo[];
  owners?: User[];
  teams?: Team[];
}

export interface DataSiloCreateInput {
  name: string;
  pluginId?: string;
  resourceId?: string;
  region?: string;
  country?: string;
  countrySubDivision?: string;
}

export interface DataSiloUpdateInput {
  id: string;
  title?: string;
  description?: string;
  notifyEmailAddress?: string;
  notifyWebhookUrl?: string;
  promptAVendorEmailIncludeIdentifiersAttachment?: boolean;
}

export interface DataPoint {
  id: string;
  name: string;
  title?: string;
  description?: string;
  path?: string[];
  dataCollection?: DataCollection;
  subDataPoints?: SubDataPoint[];
  categories?: DataCategory[];
  createdAt: string;
  updatedAt?: string;
}

export interface SubDataPoint {
  id: string;
  name: string;
  description?: string;
  categories?: DataCategory[];
  purposes?: DataPurpose[];
  accessRequestVisibility?: string;
}

export interface DataCategory {
  id: string;
  name: string;
  category: string;
  description?: string;
  regex?: string;
}

export interface DataPurpose {
  id: string;
  name: string;
  purpose: string;
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

export interface Vendor {
  id: string;
  title: string;
  description?: string;
  dataProcessingAgreementLink?: string;
  privacyPolicyLink?: string;
  contactName?: string;
  contactEmail?: string;
  websiteUrl?: string;
  headquarterCountry?: string;
  headquarterSubDivision?: string;
  dataSilos?: DataSilo[];
  createdAt: string;
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
  texts: string[];
  categories?: string[];
  model?: string;
}

export interface LLMClassificationResult {
  text: string;
  classifications: {
    category: string;
    confidence: number;
    subcategory?: string;
  }[];
}

export interface NERExtractionInput {
  text: string;
  entityTypes?: string[];
}

export interface NERExtractionResult {
  entities: {
    text: string;
    type: string;
    start: number;
    end: number;
    confidence: number;
  }[];
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
  id: string;
  title: string;
  description?: string;
  status: AssessmentStatus;
  template?: AssessmentTemplate;
  assignee?: User;
  reviewer?: User;
  dueDate?: string;
  submittedAt?: string;
  completedAt?: string;
  sections?: AssessmentSection[];
  createdAt: string;
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
