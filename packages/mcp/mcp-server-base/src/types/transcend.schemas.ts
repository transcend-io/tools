import { z } from 'zod';

// All schemas are intentionally `.passthrough()` (objects) or use `z.unknown()`
// where appropriate so that GraphQL/REST responses with extra fields keep
// validating during incremental rollout. Tightening individual fields can be
// done incrementally without breaking existing handlers.

// ── Common ───────────────────────────────────────────────────────────────

export const PaginationInfoSchema = z
  .object({
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
    startCursor: z.string().optional(),
    endCursor: z.string().optional(),
    totalCount: z.number().optional(),
  })
  .passthrough();

export const ApiErrorSchema = z
  .object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

// ── DSR Automation ───────────────────────────────────────────────────────

export const RequestTypeSchema = z.enum([
  'ACCESS',
  'ERASURE',
  'RECTIFICATION',
  'RESTRICTION',
  'SALE_OPT_OUT',
  'SALE_OPT_IN',
  'CONTACT_OPT_OUT',
  'CONTACT_OPT_IN',
  'AUTOMATED_DECISION_MAKING_OPT_OUT',
  'AUTOMATED_DECISION_MAKING_OPT_IN',
  'USE_OF_SENSITIVE_INFORMATION_OPT_OUT',
  'USE_OF_SENSITIVE_INFORMATION_OPT_IN',
  'TRACKING_OPT_OUT',
  'TRACKING_OPT_IN',
  'CUSTOM_OPT_OUT',
  'CUSTOM_OPT_IN',
  'BUSINESS_PURPOSE',
  'PLACE_ON_LEGAL_HOLD',
  'REMOVE_FROM_LEGAL_HOLD',
]);

export const RequestStatusSchema = z.enum([
  'REQUEST_MADE',
  'FAILED_VERIFICATION',
  'ENRICHING',
  'ON_HOLD',
  'WAITING',
  'COMPILING',
  'APPROVING',
  'DELAYED',
  'COMPLETED',
  'DOWNLOADABLE',
  'VIEW_CATEGORIES',
  'CANCELED',
  'SECONDARY',
  'SECONDARY_COMPLETED',
  'SECONDARY_APPROVING',
  'REVOKED',
]);

export const SubjectSchema = z
  .object({
    id: z.string(),
    email: z.string().optional(),
    name: z.string().optional(),
    coreIdentifier: z.string().optional(),
  })
  .passthrough();

export const RequestSchema = z
  .object({
    id: z.string(),
    type: z.string(),
    status: z.string(),
    subject: SubjectSchema.optional(),
    createdAt: z.string(),
    updatedAt: z.string().optional(),
    completedAt: z.string().optional(),
    daysRemaining: z.number().optional(),
    link: z.string().optional(),
  })
  .passthrough();

export const RequestIdentifierSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    value: z.string(),
    type: z.string(),
    isVerified: z.boolean(),
  })
  .passthrough();

export const RequestDataSiloSchema = z
  .object({
    id: z.string(),
    dataSilo: z.unknown(),
    status: z.string(),
    completedAt: z.string().optional(),
  })
  .passthrough();

export const RequestFileSchema = z
  .object({
    id: z.string(),
    fileName: z.string(),
    fileSize: z.number(),
    createdAt: z.string(),
    downloadUrl: z.string().optional(),
  })
  .passthrough();

export const RequestDetailsSchema = RequestSchema.extend({
  dataSubjectType: z.string().optional(),
  locale: z.string().optional(),
  isSilent: z.boolean().optional(),
  emailIsVerified: z.boolean().optional(),
  requestIdentifiers: z.array(RequestIdentifierSchema).optional(),
  requestDataSilos: z.array(RequestDataSiloSchema).optional(),
  requestFiles: z.array(RequestFileSchema).optional(),
}).passthrough();

export const DSRResponseSchema = z
  .object({
    id: z.string(),
    status: z.string(),
    message: z.string().optional(),
    nonce: z.string().optional(),
  })
  .passthrough();

export const DownloadKeySchema = z
  .object({
    key: z.string(),
    expiresAt: z.string(),
  })
  .passthrough();

// ── Consent Management ───────────────────────────────────────────────────

export const TrackingPurposeSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    trackingType: z.string(),
    description: z.string().optional(),
    isActive: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();

export const CookieServiceSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    integrationName: z.string().optional(),
  })
  .passthrough();

export const CookieSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    trackingPurposes: z.array(z.string()),
    purposes: z.array(TrackingPurposeSchema),
    frequency: z.number(),
    service: CookieServiceSchema.optional(),
    isJunk: z.boolean(),
    isRegex: z.boolean(),
    source: z.string(),
    status: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    lastDiscoveredAt: z.string().optional(),
    domains: z.array(z.string()),
    occurrences: z.number(),
    consentSiteCountAllTime: z.number(),
    consentSiteCountLastWeek: z.number(),
  })
  .passthrough();

export const ConsentDataFlowSchema = z
  .object({
    id: z.string(),
    value: z.string(),
    description: z.string().optional(),
    type: z.string(),
    trackingType: z.array(z.string()),
    purposes: z.array(TrackingPurposeSchema),
    frequency: z.number(),
    service: CookieServiceSchema.optional(),
    isJunk: z.boolean(),
    source: z.string(),
    status: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    lastDiscoveredAt: z.string().optional(),
    occurrences: z.number(),
    consentSiteCountAllTime: z.number(),
    consentSiteCountLastWeek: z.number(),
  })
  .passthrough();

export const CookieStatsSchema = z
  .object({
    total: z.number(),
    live: z.number(),
    needsReview: z.number(),
    junk: z.number(),
  })
  .passthrough();

export const PrivacyRegimeSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    code: z.string().optional(),
    description: z.string().optional(),
    isActive: z.boolean().optional(),
  })
  .passthrough();

export const AirgapBundleSchema = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    version: z.string().optional(),
    status: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    config: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export const ConsentPreferenceSchema = z
  .object({
    purpose: z.string(),
    enabled: z.union([z.boolean(), z.literal('NOTSET')]),
    timestamp: z.string().optional(),
  })
  .passthrough();

export const UserPreferencesSchema = z
  .object({
    userId: z.string().optional(),
    partition: z.string(),
    purposes: z.array(ConsentPreferenceSchema),
    identifier: z.string().optional(),
    identifierType: z.string().optional(),
    timestamp: z.string().optional(),
    confirmed: z.boolean().optional(),
  })
  .passthrough();

// ── Data Inventory ───────────────────────────────────────────────────────

export const DataCategorySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    category: z.string(),
    description: z.string().optional(),
    regex: z.string().optional(),
  })
  .passthrough();

export const DataPurposeSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    purpose: z.string(),
    description: z.string().optional(),
  })
  .passthrough();

export const SubDataPointSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    categories: z.array(DataCategorySchema).optional(),
    purposes: z.array(DataPurposeSchema).optional(),
    accessRequestVisibility: z.string().optional(),
  })
  .passthrough();

export const DataPointSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    title: z.string().optional(),
    description: z.string().optional(),
    path: z.array(z.string()).optional(),
    dataCollection: z.unknown().optional(),
    subDataPoints: z.array(SubDataPointSchema).optional(),
    categories: z.array(DataCategorySchema).optional(),
    createdAt: z.string(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export const DataCollectionSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    dataPoints: z.array(DataPointSchema).optional(),
  })
  .passthrough();

export const DataCatalogSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    integrations: z.array(z.unknown()).optional(),
  })
  .passthrough();

export const DataSiloSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    type: z.string(),
    description: z.string().optional(),
    link: z.string().optional(),
    isLive: z.boolean(),
    outerType: z.string().optional(),
    catalog: DataCatalogSchema.optional(),
    createdAt: z.string(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export const IdentifierSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    regex: z.string().optional(),
    isRequiredInForm: z.boolean().optional(),
    isVerifiedAtIngest: z.boolean().optional(),
    selectOptions: z.array(z.string()).optional(),
    prompt: z.string().optional(),
  })
  .passthrough();

export const TeamSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    members: z.array(z.unknown()).optional(),
    dataSilos: z.array(DataSiloSchema).optional(),
    createdAt: z.string(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export const UserSchema = z
  .object({
    id: z.string(),
    email: z.string(),
    name: z.string().optional(),
    title: z.string().optional(),
    role: z.string().optional(),
    teams: z.array(TeamSchema).optional(),
    isActive: z.boolean(),
    lastLoginAt: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export const DataSiloDetailsSchema = DataSiloSchema.extend({
  dataPoints: z.array(DataPointSchema).optional(),
  subjectBlocklist: z.array(z.string()).optional(),
  identifiers: z.array(IdentifierSchema).optional(),
  dependentDataSilos: z.array(DataSiloSchema).optional(),
  owners: z.array(UserSchema).optional(),
  teams: z.array(TeamSchema).optional(),
}).passthrough();

export const VendorSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    dataProcessingAgreementLink: z.string().optional(),
    privacyPolicyLink: z.string().optional(),
    contactName: z.string().optional(),
    contactEmail: z.string().optional(),
    websiteUrl: z.string().optional(),
    headquarterCountry: z.string().optional(),
    headquarterSubDivision: z.string().optional(),
    dataSilos: z.array(DataSiloSchema).optional(),
    createdAt: z.string(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

// ── Data Discovery ───────────────────────────────────────────────────────

export const ClassificationResultSchema = z
  .object({
    id: z.string(),
    path: z.string(),
    dataCategory: DataCategorySchema.optional(),
    confidence: z.number(),
    sampleData: z.string().optional(),
  })
  .passthrough();

export const ClassificationScanSchema = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    type: z.string().optional(),
    status: z.string().optional(),
    startedAt: z.string().optional(),
    completedAt: z.string().optional(),
    dataSiloId: z.string().optional(),
    results: z.array(ClassificationResultSchema).optional(),
    createdAt: z.string().optional(),
  })
  .passthrough();

export const DiscoveryPluginSchema = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    type: z.string().optional(),
    description: z.string().optional(),
    isEnabled: z.boolean().optional(),
    config: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export const LLMClassificationSchema = z
  .object({
    category: z.string(),
    confidence: z.number(),
    subcategory: z.string().optional(),
  })
  .passthrough();

export const LLMClassificationResultSchema = z
  .object({
    text: z.string(),
    classifications: z.array(LLMClassificationSchema),
  })
  .passthrough();

export const NEREntitySchema = z
  .object({
    text: z.string(),
    type: z.string(),
    start: z.number(),
    end: z.number(),
    confidence: z.number(),
  })
  .passthrough();

export const NERExtractionResultSchema = z
  .object({
    entities: z.array(NEREntitySchema),
  })
  .passthrough();

// ── Assessments ──────────────────────────────────────────────────────────

export const AssessmentAnswerOptionSchema = z
  .object({
    id: z.string(),
    index: z.number().optional(),
    value: z.string(),
  })
  .passthrough();

export const AssessmentFormQuestionSchema = z
  .object({
    id: z.string(),
    title: z.string().optional(),
    index: z.number().optional(),
    type: z.string(),
    subType: z.string().optional(),
    description: z.string().optional(),
    isRequired: z.boolean().optional(),
    placeholder: z.string().optional(),
    referenceId: z.string().optional(),
    answerOptions: z.array(AssessmentAnswerOptionSchema).optional(),
    selectedAnswers: z.array(AssessmentAnswerOptionSchema).optional(),
  })
  .passthrough();

export const AssessmentSectionSchema = z
  .object({
    id: z.string(),
    title: z.string().optional(),
    index: z.number().optional(),
    status: z.string().optional(),
    templateSection: z.unknown().optional(),
    responses: z.array(z.unknown()).optional(),
    isComplete: z.boolean().optional(),
    questions: z.array(AssessmentFormQuestionSchema).optional(),
  })
  .passthrough();

export const AssessmentTemplateSectionSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    order: z.number().optional(),
    questions: z.array(AssessmentFormQuestionSchema),
  })
  .passthrough();

export const AssessmentTemplateSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    version: z.string().optional(),
    sections: z.array(AssessmentTemplateSectionSchema).optional(),
    isActive: z.boolean().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export const AssessmentSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    status: z.string(),
    template: AssessmentTemplateSchema.optional(),
    assignee: UserSchema.optional(),
    reviewer: UserSchema.optional(),
    dueDate: z.string().optional(),
    submittedAt: z.string().optional(),
    completedAt: z.string().optional(),
    sections: z.array(AssessmentSectionSchema).optional(),
    createdAt: z.string(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export const AssessmentGroupSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    assessmentFormTemplate: z
      .object({
        id: z.string(),
        title: z.string(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export const AssessmentTemplateQuestionExportSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    index: z.number(),
    type: z.string(),
    subType: z.string(),
    description: z.string(),
    placeholder: z.string(),
    isRequired: z.boolean(),
    referenceId: z.string(),
    allowSelectOther: z.boolean(),
    requireRiskEvaluation: z.boolean(),
    answerOptions: z.array(
      z.object({ id: z.string(), index: z.number(), value: z.string() }).passthrough(),
    ),
  })
  .passthrough();

export const AssessmentTemplateSectionExportSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    index: z.number(),
    questions: z.array(AssessmentTemplateQuestionExportSchema),
  })
  .passthrough();

export const AssessmentTemplateExportSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    status: z.string(),
    source: z.string(),
    sections: z.array(AssessmentTemplateSectionExportSchema),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();

// ── Workflows ────────────────────────────────────────────────────────────

export const WorkflowSchema = z
  .object({
    id: z.string(),
    title: z.union([z.string(), z.object({ defaultMessage: z.string() }).passthrough()]).optional(),
    type: z.string().optional(),
    description: z.string().optional(),
    isActive: z.boolean().optional(),
    triggers: z.array(z.unknown()).optional(),
    actions: z.array(z.unknown()).optional(),
    config: z.unknown().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export const WorkflowConfigSchema = z
  .object({
    id: z.string(),
    title: z.string().optional(),
    subtitle: z.string().optional(),
    description: z.string().optional(),
    showInPrivacyCenter: z.boolean().optional(),
  })
  .passthrough();

export const EmailTemplateSchema = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    subject: z.string().optional(),
    bodyHtml: z.string().optional(),
    bodyText: z.string().optional(),
    type: z.string().optional(),
    locale: z.string().optional(),
    isActive: z.boolean().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

// ── Admin & Infrastructure ───────────────────────────────────────────────

export const OrganizationSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    uri: z.string().optional(),
    logoUrl: z.string().optional(),
    privacyCenterUrl: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export const ApiKeyScopeSchema = z
  .object({
    id: z.string().optional(),
    name: z.string(),
  })
  .passthrough();

export const ApiKeySchema = z
  .object({
    id: z.string(),
    title: z.string(),
    scopes: z.array(ApiKeyScopeSchema),
    lastUsedAt: z.string().optional(),
    expiresAt: z.string().optional(),
    createdAt: z.string().optional(),
    createdBy: UserSchema.optional(),
  })
  .passthrough();

export const PrivacyCenterSchema = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    url: z.string().optional(),
    logoUrl: z.string().optional(),
    primaryColor: z.string().optional(),
    config: z.record(z.string(), z.unknown()).optional(),
    locales: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();
