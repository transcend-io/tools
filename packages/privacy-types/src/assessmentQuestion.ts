/* eslint-disable max-lines */
import { makeEnum } from '@transcend-io/type-utils';

/**
 * The attributes of the DataSilo model.
 */
export const DataSiloAttribute = makeEnum({
  Description: 'description',
  Title: 'title',
  Slug: 'slug',
  ConnectionState: 'connectionState',
  Type: 'type',
  OuterType: 'outerType',
  ConnectStartTime: 'connectStartTime',
  ReconnectFormItems: 'reconnectFormItems',
  RecommendedForPrivacy: 'recommendedForPrivacy',
  RecommendedForConsent: 'recommendedForConsent',
  Url: 'url',
  WebsiteUrl: 'websiteUrl',
  Headers: 'headers',
  PlaintextContext: 'plaintextContext',
  SecretHeaders: 'secretHeaders',
  SaaSContext: 'saaSContext',
  NotifyEmailAddress: 'notifyEmailAddress',
  NotifyWebhookUrl: 'notifyWebhookUrl',
  ContactEmail: 'contactEmail',
  ContactName: 'contactName',
  Notes: 'notes',
  DataProcessingAgreementLink: 'dataProcessingAgreementLink',
  HasPersonalData: 'hasPersonalData',
  DataProcessingAgreementStatus: 'dataProcessingAgreementStatus',
  DeprecationState: 'deprecationState',
  DataRetentionNote: 'dataRetentionNote',
  IsLive: 'isLive',
  DefaultAccessRequestVisibility: 'defaultAccessRequestVisibility',
  DeletedAt: 'deletedAt',
  ExpiredAt: 'expiredAt',
  PromptAVendorEmailSendFrequency: 'promptAVendorEmailSendFrequency',
  PromptAVendorEmailStartAt: 'promptAVendorEmailStartAt',
  PromptAVendorEmailScheduledAt: 'promptAVendorEmailScheduledAt',
  PromptAVendorEmailSendType: 'promptAVendorEmailSendType',
  PromptAVendorEmailIncludeIdentifiersAttachment: 'promptAVendorEmailIncludeIdentifiersAttachment',
  PromptAVendorEmailCompletionLinkType: 'promptAVendorEmailCompletionLinkType',
  EmailSendingLock: 'emailSendingLock',
  LastConnectedAt: 'lastConnectedAt',
  LastEnabledAt: 'lastEnabledAt',
  ManualWorkRetryStartAt: 'manualWorkRetryStartAt',
  ManualWorkRetryFrequency: 'manualWorkRetryFrequency',
  ExternalId: 'externalId',
  CredentialsRefreshScheduledAt: 'credentialsRefreshScheduledAt',
  Country: 'country',
  CountrySubDivision: 'countrySubDivision',
  Subdomain: 'subdomain',
  LastLookupProcessCreationTime: 'lastLookupProcessCreationTime',
  TransferRegions: 'transferRegions',
  Controllerships: 'controllerships',
  CustomSiloConnectionStrategy: 'customSiloConnectionStrategy',
});

/** Type override */
export type DataSiloAttribute = (typeof DataSiloAttribute)[keyof typeof DataSiloAttribute];

/**
 * The DataSiloAttribute type in immutable values. They have a one-to-one
 * mapping to the DataSiloAttribute values and are used as the syncColumn
 * of AssessmentQuestions. This ensures that an assessment question can
 * always be synced to the correct dataSilo column even if it changes.
 */
type DataSiloAttributeImmutable =
  | 'CONNECT_START_TIME'
  | 'CONNECTION_STATE'
  | 'CONTACT_EMAIL'
  | 'CONTACT_NAME'
  | 'COUNTRY'
  | 'COUNTRY_SUB_DIVISION'
  | 'CREDENTIALS_REFRESH_SCHEDULED_AT'
  | 'DATA_PROCESSING_AGREEMENT_LINK'
  | 'DATA_PROCESSING_AGREEMENT_STATUS'
  | 'DATA_RETENTION_NOTE'
  | 'DEFAULT_ACCESS_REQUEST_VISIBILITY'
  | 'DELETED_AT'
  | 'DEPRECATION_STATE'
  | 'DESCRIPTION'
  | 'EMAIL_SENDING_LOCK'
  | 'EXPIRED_AT'
  | 'EXTERNAL_ID'
  | 'HAS_PERSONAL_DATA'
  | 'HEADERS'
  | 'IS_LIVE'
  | 'LAST_CONNECTED_AT'
  | 'LAST_ENABLED_AT'
  | 'LAST_LOOKUP_PROCESS_CREATION_TIME'
  | 'MANUAL_WORK_RETRY_FREQUENCY'
  | 'MANUAL_WORK_RETRY_START_AT'
  | 'NOTES'
  | 'NOTIFY_EMAIL_ADDRESS'
  | 'NOTIFY_WEBHOOK_URL'
  | 'OUTER_TYPE'
  | 'PLAINTEXT_CONTEXT'
  | 'PROMPT_A_VENDOR_EMAIL_COMPLETION_LINK_TYPE'
  | 'PROMPT_A_VENDOR_EMAIL_INCLUDE_IDENTIFIERS_ATTACHMENT'
  | 'PROMPT_A_VENDOR_EMAIL_SCHEDULED_AT'
  | 'PROMPT_A_VENDOR_EMAIL_SEND_FREQUENCY'
  | 'PROMPT_A_VENDOR_EMAIL_SEND_TYPE'
  | 'PROMPT_A_VENDOR_EMAIL_START_AT'
  | 'RECOMMENDED_FOR_CONSENT'
  | 'RECOMMENDED_FOR_PRIVACY'
  | 'RECONNECT_FORM_ITEMS'
  | 'SAAS_CONTEXT'
  | 'SECRET_HEADERS'
  | 'SLUG'
  | 'SUBDOMAIN'
  | 'TITLE'
  | 'TYPE'
  | 'URL'
  | 'WEBSITE_URL'
  | 'TRANSFER_REGIONS'
  | 'CONTROLLERSHIPS'
  | 'CUSTOM_SILO_CONNECTION_STRATEGY';

/** The value of AssessmentQuestion's syncColumn that stands for DataSilo column */
export const DataSiloAttributeSyncColumn = makeEnum<
  { [k in DataSiloAttribute]: DataSiloAttributeImmutable },
  DataSiloAttributeImmutable
>({
  connectStartTime: 'CONNECT_START_TIME',
  connectionState: 'CONNECTION_STATE',
  contactEmail: 'CONTACT_EMAIL',
  contactName: 'CONTACT_NAME',
  country: 'COUNTRY',
  countrySubDivision: 'COUNTRY_SUB_DIVISION',
  credentialsRefreshScheduledAt: 'CREDENTIALS_REFRESH_SCHEDULED_AT',
  dataProcessingAgreementLink: 'DATA_PROCESSING_AGREEMENT_LINK',
  dataProcessingAgreementStatus: 'DATA_PROCESSING_AGREEMENT_STATUS',
  dataRetentionNote: 'DATA_RETENTION_NOTE',
  defaultAccessRequestVisibility: 'DEFAULT_ACCESS_REQUEST_VISIBILITY',
  deletedAt: 'DELETED_AT',
  deprecationState: 'DEPRECATION_STATE',
  description: 'DESCRIPTION',
  emailSendingLock: 'EMAIL_SENDING_LOCK',
  expiredAt: 'EXPIRED_AT',
  externalId: 'EXTERNAL_ID',
  hasPersonalData: 'HAS_PERSONAL_DATA',
  headers: 'HEADERS',
  isLive: 'IS_LIVE',
  lastConnectedAt: 'LAST_CONNECTED_AT',
  lastEnabledAt: 'LAST_ENABLED_AT',
  lastLookupProcessCreationTime: 'LAST_LOOKUP_PROCESS_CREATION_TIME',
  manualWorkRetryFrequency: 'MANUAL_WORK_RETRY_FREQUENCY',
  manualWorkRetryStartAt: 'MANUAL_WORK_RETRY_START_AT',
  notes: 'NOTES',
  notifyEmailAddress: 'NOTIFY_EMAIL_ADDRESS',
  notifyWebhookUrl: 'NOTIFY_WEBHOOK_URL',
  outerType: 'OUTER_TYPE',
  plaintextContext: 'PLAINTEXT_CONTEXT',
  promptAVendorEmailCompletionLinkType: 'PROMPT_A_VENDOR_EMAIL_COMPLETION_LINK_TYPE',
  promptAVendorEmailIncludeIdentifiersAttachment:
    'PROMPT_A_VENDOR_EMAIL_INCLUDE_IDENTIFIERS_ATTACHMENT',
  promptAVendorEmailScheduledAt: 'PROMPT_A_VENDOR_EMAIL_SCHEDULED_AT',
  promptAVendorEmailSendFrequency: 'PROMPT_A_VENDOR_EMAIL_SEND_FREQUENCY',
  promptAVendorEmailSendType: 'PROMPT_A_VENDOR_EMAIL_SEND_TYPE',
  promptAVendorEmailStartAt: 'PROMPT_A_VENDOR_EMAIL_START_AT',
  recommendedForConsent: 'RECOMMENDED_FOR_CONSENT',
  recommendedForPrivacy: 'RECOMMENDED_FOR_PRIVACY',
  reconnectFormItems: 'RECONNECT_FORM_ITEMS',
  saaSContext: 'SAAS_CONTEXT',
  secretHeaders: 'SECRET_HEADERS',
  slug: 'SLUG',
  subdomain: 'SUBDOMAIN',
  title: 'TITLE',
  type: 'TYPE',
  url: 'URL',
  websiteUrl: 'WEBSITE_URL',
  transferRegions: 'TRANSFER_REGIONS',
  controllerships: 'CONTROLLERSHIPS',
  customSiloConnectionStrategy: 'CUSTOM_SILO_CONNECTION_STRATEGY',
});

/** Type override */
export type DataSiloAttributeSyncColumn =
  (typeof DataSiloAttributeSyncColumn)[keyof typeof DataSiloAttributeSyncColumn];

/**
 * The SubDataPointAttribute type in immutable values. They have a one-to-one
 * mapping to the SubDataPointAttribute values and are used as the syncColumn
 * of AssessmentQuestions. This ensures that an assessment question can
 * always be synced to the correct subDataPoint column even if it changes.
 */
type SubDataPointAttributeImmutable =
  | 'NAME'
  | 'SLUG'
  | 'DATA_POINT_ID'
  | 'DESCRIPTION'
  | 'ENCRYPTED_SAMPLES_S3_KEY'
  | 'ACCESS_REQUESTED_VISIBILITY_ENABLED'
  | 'ENSURE_REQUEST_REDACTION_ENABLED'
  | 'LAST_CLASSIFIED_AT'
  | 'LAST_RUN_AT'
  | 'ERROR'
  | 'ERROR_COUNT'
  | 'CONTEXT'
  | 'CONTENT_CLASSIFICATION_STATUS'
  | 'NON_NULL_CHECK_COMPLETED'
  | 'CONTROLLERSHIP'
  | 'RETENTION_TYPE'
  | 'RETENTION_PERIOD'
  | 'SCAN_RUN_ID'
  | 'DELETED_AT'
  | 'DATA_TYPE'
  | 'ENCRYPTION'
  | 'IS_PRIMARY_KEY'
  | 'METADATA'
  | 'SCHEDULING_PRIORITY';

/**
 * The attributes of the SubDataPoint model.
 */
export const SubDataPointAttribute = makeEnum({
  Name: 'name',
  Slug: 'slug',
  DataPointId: 'dataPointId',
  Description: 'description',
  EncryptedSamplesS3Key: 'encryptedSamplesS3Key',
  AccessRequestVisibilityEnabled: 'accessRequestVisibilityEnabled',
  ErasureRequestRedactionEnabled: 'erasureRequestRedactionEnabled',
  LastClassifiedAt: 'lastClassifiedAt',
  LastRunAt: 'lastRunAt',
  Error: 'error',
  ErrorCount: 'errorCount',
  Context: 'context',
  ContentClassificationStatus: 'contentClassificationStatus',
  NonNullCheckCompleted: 'nonNullCheckCompleted',
  Controllership: 'controllership',
  RetentionType: 'retentionType',
  RetentionPeriod: 'retentionPeriod',
  ScanRunId: 'scanRunId',
  DeletedAt: 'deletedAt',
  DataType: 'dataType',
  Encryption: 'encryption',
  IsPrimaryKey: 'isPrimaryKey',
  Metadata: 'metadata',
  SchedulingPriority: 'schedulingPriority',
});

/** Type override */
export type SubDataPointAttribute =
  (typeof SubDataPointAttribute)[keyof typeof SubDataPointAttribute];

/** The value of AssessmentQuestion's syncColumn that stands for SubDataPoint column */
export const SubDataPointAttributeSyncColumn = makeEnum<
  { [k in SubDataPointAttribute]: SubDataPointAttributeImmutable },
  SubDataPointAttributeImmutable
>({
  name: 'NAME',
  slug: 'SLUG',
  dataPointId: 'DATA_POINT_ID',
  description: 'DESCRIPTION',
  encryptedSamplesS3Key: 'ENCRYPTED_SAMPLES_S3_KEY',
  accessRequestVisibilityEnabled: 'ACCESS_REQUESTED_VISIBILITY_ENABLED',
  erasureRequestRedactionEnabled: 'ENSURE_REQUEST_REDACTION_ENABLED',
  lastClassifiedAt: 'LAST_CLASSIFIED_AT',
  lastRunAt: 'LAST_RUN_AT',
  error: 'ERROR',
  errorCount: 'ERROR_COUNT',
  context: 'CONTEXT',
  contentClassificationStatus: 'CONTENT_CLASSIFICATION_STATUS',
  nonNullCheckCompleted: 'NON_NULL_CHECK_COMPLETED',
  controllership: 'CONTROLLERSHIP',
  retentionType: 'RETENTION_TYPE',
  retentionPeriod: 'RETENTION_PERIOD',
  scanRunId: 'SCAN_RUN_ID',
  deletedAt: 'DELETED_AT',
  dataType: 'DATA_TYPE',
  encryption: 'ENCRYPTION',
  isPrimaryKey: 'IS_PRIMARY_KEY',
  metadata: 'METADATA',
  schedulingPriority: 'SCHEDULING_PRIORITY',
});

/** Type override */
export type SubDataPointAttributeSyncColumn =
  (typeof SubDataPointAttributeSyncColumn)[keyof typeof SubDataPointAttributeSyncColumn];

/**
 * The VendorAttribute type in immutable values. They have a one-to-one
 * mapping to the VendorAttribute values and are used as the syncColumn
 * of AssessmentQuestions. This ensures that an assessment question can
 * always be synced to the correct subDataPoint column even if it changes.
 */
type VendorAttributeImmutable =
  | 'TITLE'
  | 'SLUG'
  | 'DESCRIPTION'
  | 'DATA_PROCESSING_AGREEMENT_LINK'
  | 'DATA_PROCESSING_AGREEMENT_STATUS'
  | 'CONTACT_EMAIL'
  | 'CONTACT_NAME'
  | 'CONTACT_PHONE'
  | 'ADDRESS'
  | 'HEADQUARTER_COUNTRY'
  | 'HEADQUARTER_SUB_DIVISION'
  | 'WEBSITE_URL'
  | 'PRIVACY_POLICY_URL';

/**
 * The attributes of the Vendor model.
 */
export const VendorAttribute = makeEnum({
  Title: 'title',
  Slug: 'slug',
  Description: 'description',
  DataProcessingAgreementLink: 'dataProcessingAgreementLink',
  DataProcessingAgreementStatus: 'dataProcessingAgreementStatus',
  ContactEmail: 'contactEmail',
  ContactName: 'contactName',
  ContactPhone: 'contactPhone',
  Address: 'address',
  HeadquarterCountry: 'headquarterCountry',
  HeadquarterSubDivision: 'headquarterSubDivision',
  WebsiteUrl: 'websiteUrl',
  PrivacyPolicyUrl: 'privacyPolicyUrl',
});

/** Type override */
export type VendorAttribute = (typeof VendorAttribute)[keyof typeof VendorAttribute];

/** The value of AssessmentQuestion's syncColumn that stands for Vendor column */
export const VendorAttributeSyncColumn = makeEnum<
  { [k in VendorAttribute]: VendorAttributeImmutable },
  VendorAttributeImmutable
>({
  title: 'TITLE',
  slug: 'SLUG',
  description: 'DESCRIPTION',
  dataProcessingAgreementLink: 'DATA_PROCESSING_AGREEMENT_LINK',
  dataProcessingAgreementStatus: 'DATA_PROCESSING_AGREEMENT_STATUS',
  contactEmail: 'CONTACT_EMAIL',
  contactName: 'CONTACT_NAME',
  contactPhone: 'CONTACT_PHONE',
  address: 'ADDRESS',
  headquarterCountry: 'HEADQUARTER_COUNTRY',
  headquarterSubDivision: 'HEADQUARTER_SUB_DIVISION',
  websiteUrl: 'WEBSITE_URL',
  privacyPolicyUrl: 'PRIVACY_POLICY_URL',
});

/** Type override */
export type VendorAttributeSyncColumn =
  (typeof VendorAttributeSyncColumn)[keyof typeof VendorAttributeSyncColumn];

/**
 * The DataSubCategoryAttribute type in immutable values. They have a one-to-one
 * mapping to the DataSubCategoryAttribute values and are used as the syncColumn
 * of AssessmentQuestions. This ensures that an assessment question can
 * always be synced to the correct subDataPoint column even if it changes.
 */
type DataSubCategoryAttributeImmutable =
  | 'NAME'
  | 'SLUG'
  | 'DESCRIPTION'
  | 'CATEGORY'
  | 'IS_DEFAULT'
  | 'REGEX';

/**
 * The attributes of the DataSubCategory model.
 */
export const DataSubCategoryAttribute = makeEnum({
  Name: 'name',
  Slug: 'slug',
  Description: 'description',
  Category: 'category',
  IsDefault: 'isDefault',
  Regex: 'regex',
});

/** Type override */
export type DataSubCategoryAttribute =
  (typeof DataSubCategoryAttribute)[keyof typeof DataSubCategoryAttribute];

/** The value of AssessmentQuestion's syncColumn that stands for DataSubCategory column */
export const DataSubCategoryAttributeSyncColumn = makeEnum<
  { [k in DataSubCategoryAttribute]: DataSubCategoryAttributeImmutable },
  DataSubCategoryAttributeImmutable
>({
  name: 'NAME',
  slug: 'SLUG',
  description: 'DESCRIPTION',
  category: 'CATEGORY',
  isDefault: 'IS_DEFAULT',
  regex: 'REGEX',
});

/** Type override */
export type DataSubCategoryAttributeSyncColumn =
  (typeof DataSubCategoryAttributeSyncColumn)[keyof typeof DataSubCategoryAttributeSyncColumn];

/**
 * The ProcessingPurposeSubCategoryAttribute type in immutable values. They have a one-to-one
 * mapping to the ProcessingPurposeSubCategoryAttribute values and are used as the syncColumn
 * of AssessmentQuestions. This ensures that an assessment question can always be synced to the
 * correct subDataPoint column even if it changes.
 */
type ProcessingPurposeSubCategoryAttributeImmutable =
  | 'NAME'
  | 'SLUG'
  | 'DESCRIPTION'
  | 'PURPOSE'
  | 'IS_DEFAULT';

/**
 * The attributes of the ProcessingPurposeSubCategory model.
 */
export const ProcessingPurposeSubCategoryAttribute = makeEnum({
  Name: 'name',
  Slug: 'slug',
  Description: 'description',
  Purpose: 'purpose',
  IsDefault: 'isDefault',
});

/** Type override */
export type ProcessingPurposeSubCategoryAttribute =
  (typeof ProcessingPurposeSubCategoryAttribute)[keyof typeof ProcessingPurposeSubCategoryAttribute];

/** The value of AssessmentQuestion's syncColumn that stands for ProcessingPurposeSubCategory column */
export const ProcessingPurposeSubCategoryAttributeSyncColumn = makeEnum<
  {
    [k in ProcessingPurposeSubCategoryAttribute]: ProcessingPurposeSubCategoryAttributeImmutable;
  },
  ProcessingPurposeSubCategoryAttributeImmutable
>({
  name: 'NAME',
  slug: 'SLUG',
  description: 'DESCRIPTION',
  purpose: 'PURPOSE',
  isDefault: 'IS_DEFAULT',
});

/** Type override */
export type ProcessingPurposeSubCategoryAttributeSyncColumn =
  (typeof ProcessingPurposeSubCategoryAttributeSyncColumn)[keyof typeof ProcessingPurposeSubCategoryAttributeSyncColumn];

/**
 * The BusinessEntityAttribute type in immutable values. They have a one-to-one
 * mapping to the BusinessEntityAttribute values and are used as the syncColumn
 * of AssessmentQuestions. This ensures that an assessment question can
 * always be synced to the correct subDataPoint column even if it changes.
 */
type BusinessEntityAttributeImmutable =
  | 'TITLE'
  | 'SLUG'
  | 'DESCRIPTION'
  | 'HEADQUARTER_COUNTRY'
  | 'HEADQUARTER_SUB_DIVISION'
  | 'ADDRESS'
  | 'DATA_PROTECTION_OFFICER_EMAIL'
  | 'DATA_PROTECTION_OFFICER_NAME';

/**
 * The attributes of the BusinessEntity model.
 */
export const BusinessEntityAttribute = makeEnum({
  Title: 'title',
  Slug: 'slug',
  Description: 'description',
  HeadquarterCountry: 'headquarterCountry',
  HeadquarterSubDivision: 'headquarterSubDivision',
  Address: 'address',
  DataProtectionOfficerEmail: 'dataProtectionOfficerEmail',
  DataProtectionOfficerName: 'dataProtectionOfficerName',
});

/** Type override */
export type BusinessEntityAttribute =
  (typeof BusinessEntityAttribute)[keyof typeof BusinessEntityAttribute];

/** The value of AssessmentQuestion's syncColumn that stands for BusinessEntity column */
export const BusinessEntityAttributeSyncColumn = makeEnum<
  {
    [k in BusinessEntityAttribute]: BusinessEntityAttributeImmutable;
  },
  BusinessEntityAttributeImmutable
>({
  title: 'TITLE',
  slug: 'SLUG',
  description: 'DESCRIPTION',
  headquarterCountry: 'HEADQUARTER_COUNTRY',
  headquarterSubDivision: 'HEADQUARTER_SUB_DIVISION',
  address: 'ADDRESS',
  dataProtectionOfficerEmail: 'DATA_PROTECTION_OFFICER_EMAIL',
  dataProtectionOfficerName: 'DATA_PROTECTION_OFFICER_NAME',
});

/** Type override */
export type BusinessEntityAttributeSyncColumn =
  (typeof BusinessEntityAttributeSyncColumn)[keyof typeof BusinessEntityAttributeSyncColumn];

/**
 * The ProcessingActivityAttribute type in immutable values. They have a one-to-one
 * mapping to the ProcessingActivityAttribute values and are used as the syncColumn
 * of AssessmentQuestions. This ensures that an assessment question can
 * always be synced to the correct processing activity column even if it changes.
 */
type ProcessingActivityAttributeImmutable =
  | 'TITLE'
  | 'DESCRIPTION'
  | 'SECURITY_MEASURE_DETAILS'
  | 'CONTROLLERSHIPS'
  | 'STORAGE_REGIONS'
  | 'TRANSFER_REGIONS'
  | 'RETENTION_TYPE'
  | 'RETENTION_PERIOD'
  | 'DATA_PROTECTION_IMPACT_ASSESSMENT_LINK'
  | 'DATA_PROTECTION_IMPACT_ASSESSMENT_STATUS';

/**
 * The attributes of the ProcessingActivity model.
 */
export const ProcessingActivityAttribute = makeEnum({
  Title: 'title',
  Description: 'description',
  SecurityMeasureDetails: 'securityMeasureDetails',
  Controllerships: 'controllerships',
  StorageRegions: 'storageRegions',
  TransferRegions: 'transferRegions',
  RetentionType: 'retentionType',
  RetentionPeriod: 'retentionPeriod',
  DataProtectionImpactAssessmentLink: 'dataProtectionImpactAssessmentLink',
  DataProtectionImpactAssessmentStatus: 'dataProtectionImpactAssessmentStatus',
});

/** Type override */
export type ProcessingActivityAttribute =
  (typeof ProcessingActivityAttribute)[keyof typeof ProcessingActivityAttribute];

/** The value of AssessmentQuestion's syncColumn that stands for ProcessingActivity column */
export const ProcessingActivityAttributeSyncColumn = makeEnum<
  {
    [k in ProcessingActivityAttribute]: ProcessingActivityAttributeImmutable;
  },
  ProcessingActivityAttributeImmutable
>({
  title: 'TITLE',
  description: 'DESCRIPTION',
  securityMeasureDetails: 'SECURITY_MEASURE_DETAILS',
  controllerships: 'CONTROLLERSHIPS',
  storageRegions: 'STORAGE_REGIONS',
  transferRegions: 'TRANSFER_REGIONS',
  retentionType: 'RETENTION_TYPE',
  retentionPeriod: 'RETENTION_PERIOD',
  dataProtectionImpactAssessmentLink: 'DATA_PROTECTION_IMPACT_ASSESSMENT_LINK',
  dataProtectionImpactAssessmentStatus: 'DATA_PROTECTION_IMPACT_ASSESSMENT_STATUS',
});

/** Type override */
export type ProcessingActivityAttributeSyncColumn =
  (typeof ProcessingActivityAttributeSyncColumn)[keyof typeof ProcessingActivityAttributeSyncColumn];

/**
 * All Attributes merged into a single type
 */
export type AssessmentSyncColumnAttribute =
  | DataSiloAttribute
  | SubDataPointAttribute
  | VendorAttribute
  | DataSubCategoryAttribute
  | ProcessingPurposeSubCategoryAttribute
  | BusinessEntityAttribute
  | ProcessingActivityAttribute;

/**
 * All Immutable Attributes merged into a single type
 */
export type AssessmentSyncColumnImmutable =
  | DataSiloAttributeImmutable
  | SubDataPointAttributeImmutable
  | VendorAttributeImmutable
  | DataSubCategoryAttributeImmutable
  | ProcessingPurposeSubCategoryAttributeImmutable
  | BusinessEntityAttributeImmutable
  | ProcessingActivityAttributeImmutable;

/** The type of the AssessmentQuestion's  syncColumn field  */
export const AssessmentSyncColumn = makeEnum<
  {
    [k in AssessmentSyncColumnImmutable]: AssessmentSyncColumnImmutable;
  },
  AssessmentSyncColumnImmutable
>({
  TITLE: 'TITLE',
  SLUG: 'SLUG',
  DESCRIPTION: 'DESCRIPTION',
  HEADQUARTER_COUNTRY: 'HEADQUARTER_COUNTRY',
  CONNECTION_STATE: 'CONNECTION_STATE',
  CONNECT_START_TIME: 'CONNECT_START_TIME',
  CONTACT_EMAIL: 'CONTACT_EMAIL',
  CONTACT_NAME: 'CONTACT_NAME',
  COUNTRY: 'COUNTRY',
  COUNTRY_SUB_DIVISION: 'COUNTRY_SUB_DIVISION',
  CREDENTIALS_REFRESH_SCHEDULED_AT: 'CREDENTIALS_REFRESH_SCHEDULED_AT',
  DATA_PROCESSING_AGREEMENT_LINK: 'DATA_PROCESSING_AGREEMENT_LINK',
  DATA_PROCESSING_AGREEMENT_STATUS: 'DATA_PROCESSING_AGREEMENT_STATUS',
  DATA_RETENTION_NOTE: 'DATA_RETENTION_NOTE',
  DEFAULT_ACCESS_REQUEST_VISIBILITY: 'DEFAULT_ACCESS_REQUEST_VISIBILITY',
  DELETED_AT: 'DELETED_AT',
  DEPRECATION_STATE: 'DEPRECATION_STATE',
  EMAIL_SENDING_LOCK: 'EMAIL_SENDING_LOCK',
  EXPIRED_AT: 'EXPIRED_AT',
  EXTERNAL_ID: 'EXTERNAL_ID',
  HAS_PERSONAL_DATA: 'HAS_PERSONAL_DATA',
  HEADERS: 'HEADERS',
  IS_LIVE: 'IS_LIVE',
  LAST_CONNECTED_AT: 'LAST_CONNECTED_AT',
  LAST_ENABLED_AT: 'LAST_ENABLED_AT',
  LAST_LOOKUP_PROCESS_CREATION_TIME: 'LAST_LOOKUP_PROCESS_CREATION_TIME',
  MANUAL_WORK_RETRY_FREQUENCY: 'MANUAL_WORK_RETRY_FREQUENCY',
  MANUAL_WORK_RETRY_START_AT: 'MANUAL_WORK_RETRY_START_AT',
  NOTES: 'NOTES',
  NOTIFY_EMAIL_ADDRESS: 'NOTIFY_EMAIL_ADDRESS',
  NOTIFY_WEBHOOK_URL: 'NOTIFY_WEBHOOK_URL',
  OUTER_TYPE: 'OUTER_TYPE',
  PLAINTEXT_CONTEXT: 'PLAINTEXT_CONTEXT',
  PROMPT_A_VENDOR_EMAIL_COMPLETION_LINK_TYPE: 'PROMPT_A_VENDOR_EMAIL_COMPLETION_LINK_TYPE',
  PROMPT_A_VENDOR_EMAIL_INCLUDE_IDENTIFIERS_ATTACHMENT:
    'PROMPT_A_VENDOR_EMAIL_INCLUDE_IDENTIFIERS_ATTACHMENT',
  PROMPT_A_VENDOR_EMAIL_SCHEDULED_AT: 'PROMPT_A_VENDOR_EMAIL_SCHEDULED_AT',
  PROMPT_A_VENDOR_EMAIL_SEND_FREQUENCY: 'PROMPT_A_VENDOR_EMAIL_SEND_FREQUENCY',
  PROMPT_A_VENDOR_EMAIL_SEND_TYPE: 'PROMPT_A_VENDOR_EMAIL_SEND_TYPE',
  PROMPT_A_VENDOR_EMAIL_START_AT: 'PROMPT_A_VENDOR_EMAIL_START_AT',
  RECOMMENDED_FOR_CONSENT: 'RECOMMENDED_FOR_CONSENT',
  RECOMMENDED_FOR_PRIVACY: 'RECOMMENDED_FOR_PRIVACY',
  RECONNECT_FORM_ITEMS: 'RECONNECT_FORM_ITEMS',
  SAAS_CONTEXT: 'SAAS_CONTEXT',
  SECRET_HEADERS: 'SECRET_HEADERS',
  SUBDOMAIN: 'SUBDOMAIN',
  TYPE: 'TYPE',
  URL: 'URL',
  WEBSITE_URL: 'WEBSITE_URL',
  TRANSFER_REGIONS: 'TRANSFER_REGIONS',
  CONTROLLERSHIPS: 'CONTROLLERSHIPS',
  NAME: 'NAME',
  DATA_POINT_ID: 'DATA_POINT_ID',
  ENCRYPTED_SAMPLES_S3_KEY: 'ENCRYPTED_SAMPLES_S3_KEY',
  ACCESS_REQUESTED_VISIBILITY_ENABLED: 'ACCESS_REQUESTED_VISIBILITY_ENABLED',
  ENSURE_REQUEST_REDACTION_ENABLED: 'ENSURE_REQUEST_REDACTION_ENABLED',
  LAST_CLASSIFIED_AT: 'LAST_CLASSIFIED_AT',
  LAST_RUN_AT: 'LAST_RUN_AT',
  ERROR: 'ERROR',
  ERROR_COUNT: 'ERROR_COUNT',
  CONTEXT: 'CONTEXT',
  CONTENT_CLASSIFICATION_STATUS: 'CONTENT_CLASSIFICATION_STATUS',
  NON_NULL_CHECK_COMPLETED: 'NON_NULL_CHECK_COMPLETED',
  CONTROLLERSHIP: 'CONTROLLERSHIP',
  RETENTION_TYPE: 'RETENTION_TYPE',
  RETENTION_PERIOD: 'RETENTION_PERIOD',
  SCAN_RUN_ID: 'SCAN_RUN_ID',
  CONTACT_PHONE: 'CONTACT_PHONE',
  ADDRESS: 'ADDRESS',
  HEADQUARTER_SUB_DIVISION: 'HEADQUARTER_SUB_DIVISION',
  PRIVACY_POLICY_URL: 'PRIVACY_POLICY_URL',
  CATEGORY: 'CATEGORY',
  IS_DEFAULT: 'IS_DEFAULT',
  REGEX: 'REGEX',
  PURPOSE: 'PURPOSE',
  DATA_PROTECTION_OFFICER_EMAIL: 'DATA_PROTECTION_OFFICER_EMAIL',
  DATA_PROTECTION_OFFICER_NAME: 'DATA_PROTECTION_OFFICER_NAME',
  DATA_TYPE: 'DATA_TYPE',
  ENCRYPTION: 'ENCRYPTION',
  IS_PRIMARY_KEY: 'IS_PRIMARY_KEY',
  CUSTOM_SILO_CONNECTION_STRATEGY: 'CUSTOM_SILO_CONNECTION_STRATEGY',
  SECURITY_MEASURE_DETAILS: 'SECURITY_MEASURE_DETAILS',
  STORAGE_REGIONS: 'STORAGE_REGIONS',
  DATA_PROTECTION_IMPACT_ASSESSMENT_LINK: 'DATA_PROTECTION_IMPACT_ASSESSMENT_LINK',
  DATA_PROTECTION_IMPACT_ASSESSMENT_STATUS: 'DATA_PROTECTION_IMPACT_ASSESSMENT_STATUS',
  METADATA: 'METADATA',
  SCHEDULING_PRIORITY: 'SCHEDULING_PRIORITY',
});

/** Type override */
export type AssessmentSyncColumn = (typeof AssessmentSyncColumn)[keyof typeof AssessmentSyncColumn];

/** The data inventory models that can be synced from an Assessment Form */
export const AssessmentSyncModel = makeEnum({
  /** DataSilo model */
  DataSilo: 'dataSilo',
  /** SubDataPoint model */
  SubDataPoint: 'subDataPoint',
  /** Vendor model */
  Vendor: 'vendor',
  /** DataSubCategory model */
  DataSubCategory: 'dataSubCategory',
  /** ProcessingPurposeSubCategory model */
  ProcessingPurposeSubCategory: 'processingPurposeSubCategory',
  /** BusinessEntity model */
  BusinessEntity: 'businessEntity',
  /** ProcessingActivity model */
  ProcessingActivity: 'processingActivity',
});

/** Type overrides */
export type AssessmentSyncModel = (typeof AssessmentSyncModel)[keyof typeof AssessmentSyncModel];

/* eslint-enable max-lines */
