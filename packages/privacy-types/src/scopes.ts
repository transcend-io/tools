/* eslint-disable max-lines */

import { getEntries, getValues } from '@transcend-io/type-utils';

/**
 * The possible scopes that can be assigned to a user or team
 */
export enum ScopeName {
  ReadOnly = 'readOnly',
  FullAdmin = 'fullAdmin',
  ViewAllActionItems = 'viewAllActionItems',
  ManageAllActionItems = 'manageAllActionItems',
  MakeDataSubjectRequest = 'makeDataSubjectRequest',
  ConnectDataSilos = 'connectDataSilos',
  DeployPrivacyCenter = 'deployPrivacyCenter',
  ManageConsentManager = 'manageConsentManager',
  ViewConsentManager = 'viewConsentManager',
  ManageConsentManagerDisplaySettings = 'manageConsentManagerDisplaySettings',
  ManageConsentManagerDeveloperSettings = 'manageConsentManagerDeveloperSettings',
  ManageDataFlow = 'manageDataFlow',
  DeployConsentManager = 'deployConsentManager',
  DeployTestConsentManager = 'deployTestConsentManager',
  ViewCustomerDataDataMapping = 'viewCustomerDataDataMapping',
  ViewCustomerDataPrivacyRequests = 'viewCustomerDataPrivacyRequests',
  ManageAccessControl = 'manageAccessControl',
  ManageApiKeys = 'manageApiKeys',
  ManageBilling = 'manageBilling',
  ManageDataMap = 'manageDataMap',
  ManageAssignedIntegrations = 'managedAssignedIntegrations',
  ManageAssignedDataInventory = 'managedAssignedDataInventory',
  ManageAssignedConsentManager = 'managedAssignedConsentManager',
  ManageAssignedRequests = 'managedAssignedRequests',
  ManageAssignedBulkRespond = 'manageAssignedBulkRespond',
  ViewAssignedIntegrations = 'viewAssignedIntegrations',
  ViewAssignedDataInventory = 'viewAssignedDataInventory',
  ViewAssignedConsentManager = 'viewAssignedConsentManager',
  ViewAssignedRequests = 'viewAssignedRequests',
  ManageDataSubjectRequestSettings = 'manageDataSubjectRequestSettings',
  ManageEmailTemplates = 'manageEmailTemplates',
  ManageOrganizationInfo = 'manageOrganizationInfo',
  ManagePrivacyCenter = 'managePrivacyCenter',
  ViewPrivacyCenter = 'viewPrivacyCenter',
  ManageLegalHold = 'manageLegalHold',
  ManageRequestCompilation = 'manageRequestCompilation',
  ManageRequestIdentities = 'manageRequestIdentities',
  ManageRequestSecurity = 'manageRequestSecurity',
  ManageSombraRootKeys = 'manageSombraRootKeys',
  ManageSSO = 'manageSSO',
  ManageEmailDomains = 'manageEmailDomains',
  RequestApproval = 'requestApproval',
  ViewApiKeys = 'viewApiKeys',
  ViewDataFlow = 'viewDataFlow',
  ViewDataMap = 'viewDataMap',
  ViewLegalHold = 'viewLegalHold',
  ViewDataSubjectRequestSettings = 'viewDataSubjectRequestSettings',
  ViewEmailTemplates = 'viewEmailTemplates',
  ViewEmailDomains = 'viewEmailDomains',
  ViewRequestCompilation = 'viewRequestCompilation',
  ViewRequestIdentitySettings = 'viewRequestIdentitySettings',
  ViewRequests = 'viewRequests',
  ViewScopes = 'viewScopes',
  ViewSSO = 'viewSSO',
  ViewEmployees = 'viewEmployees',
  ViewDataInventory = 'viewDataInventory',
  ManageDataInventory = 'manageDataInventory',
  ManageGlobalAttributes = 'manageGlobalAttributes',
  ViewGlobalAttributes = 'viewGlobalAttributes',
  ViewAssessments = 'viewAssessments',
  ManageAssessments = 'manageAssessments',
  ViewAssignedAssessments = 'viewAssignedAssessments',
  ManageAssignedAssessments = 'manageAssignedAssessments',
  ManagePrompts = 'managePrompts',
  ManagePromptRuns = 'managePromptRuns',
  ExecutePrompt = 'executePrompt',
  ViewPromptRuns = 'viewPromptRuns',
  ViewPrompts = 'viewPrompts',
  ApprovePrompts = 'approvePrompts',
  ManageAuditor = 'manageAuditor',
  ExecuteAuditor = 'executeAuditor',
  ViewCodeScanning = 'viewCodeScanning',
  ManageCodeScanning = 'manageCodeScanning',
  ViewPathfinder = 'viewPathfinder',
  ManagePathfinder = 'managePathfinder',
  ViewContractScanning = 'viewContractScanning',
  ManageContractScanning = 'manageContractScanning',
  ViewAuditorRuns = 'viewAuditorRuns',
  ViewAuditEvents = 'viewAuditEvents',
  ManageActionItemCollections = 'manageActionItemCollections',
  ViewManagedConsentDatabaseAdminApi = 'viewManagedConsentDatabaseAdminApi',
  ManageStoredPreferences = 'manageStoredPreferences',
  ManagePreferenceStoreSettings = 'managePreferenceStoreSettings',
  ViewPreferenceStoreSettings = 'viewPreferenceStoreSettings',
  ManagePolicies = 'managePolicies',
  ViewPolicies = 'viewPolicies',
  ManageIntlMessages = 'manageIntlMessages',
  ViewIntlMessages = 'viewIntlMessages',
  LLMLogTransfer = 'llmLogTransfer',
  ManageWorkflows = 'manageWorkflows',
  ViewDataSubCategories = 'viewDataSubCategories',
  ManageDataSubCategories = 'manageDataSubCategories',
  GeneratePreferenceAccessTokens = 'generatePreferenceAccessTokens',
  ViewRules = 'viewRules',
  ManageRules = 'manageRules',
  ViewAssignedRules = 'viewAssignedRules',
  ManageAssignedRules = 'manageAssignedRules',
  ExecuteRules = 'executeRules',
}

/**
 * The type of scope
 */
export enum ScopeType {
  /** A scope that will make modifications to something on Transcend */
  Modify = 'MODIFY',
  /** A scope that allows view access to some resource */
  View = 'VIEW',
}

/**
 * The related product offering where the scope is used
 */
export enum TranscendProduct {
  DsrAutomation = 'DSR_AUTOMATION',
  DataInventory = 'DATA_INVENTORY',
  ConsentManagement = 'CONSENT_MANAGEMENT',
  PrivacyCenter = 'PRIVACY_CENTER',
  Administration = 'ADMINISTRATION',
  Assessments = 'ASSESSMENTS',
  Pathfinder = 'PATHFINDER',
  PreferenceManagement = 'PREFERENCE_MANAGEMENT',
  PromptManagement = 'PROMPT_MANAGER',
  ContractScanning = 'CONTRACT_SCANNING',
  WebAuditor = 'WEB_AUDITOR',
  Sombra = 'SOMBRA',
  SiloDiscovery = 'SILO_DISCOVERY',
  StructuredDiscovery = 'STRUCTURED_DISCOVERY',
  UnstructuredDiscovery = 'UNSTRUCTURED_DISCOVERY',
  DataLineage = 'DATA_LINEAGE',
  RulesAutomation = 'RULES_AUTOMATION',
}

/**
 * A scope definition
 */
export interface ScopeDefinition {
  /** The display title of the scope */
  title: string;
  /** The display description of the scope */
  description: string;
  /** The broad category of scope */
  type: ScopeType;
  /** The scopes that must also be allowed to make that scope functional */
  dependencies: ScopeName[];
  /** Related product offerings */
  products: TranscendProduct[];
}

/**
 * The action scope definitions
 */
const SCOPES_WITHOUT_VIEW_ONLY: {
  [name in Exclude<ScopeName, ScopeName.ReadOnly>]: ScopeDefinition;
} = {
  [ScopeName.FullAdmin]: {
    dependencies: Object.values(ScopeName).filter((scope) => scope !== ScopeName.FullAdmin),
    description: 'Full administrative access. All scopes are granted.',
    title: 'Full Admin',
    type: ScopeType.Modify,
    products: getValues(TranscendProduct),
  },
  [ScopeName.ManageSombraRootKeys]: {
    dependencies: [],
    description:
      'Ability to perform a key rotation on the encryption keys used within your account.',
    title: 'Rotate Hosted Sombra keys',
    type: ScopeType.Modify,
    products: [TranscendProduct.Sombra],
  },
  [ScopeName.ManageGlobalAttributes]: {
    dependencies: [ScopeName.ViewGlobalAttributes],
    description:
      // eslint-disable-next-line max-len
      'Under the infrastructure tab, manage your custom attributes and select which views those attributes should display in.',
    title: 'Manage Global Attributes',
    type: ScopeType.Modify,
    products: [
      TranscendProduct.DsrAutomation,
      TranscendProduct.DataInventory,
      TranscendProduct.ConsentManagement,
      TranscendProduct.StructuredDiscovery,
      TranscendProduct.Administration,
      TranscendProduct.Assessments,
      TranscendProduct.Pathfinder,
      TranscendProduct.PromptManagement,
      TranscendProduct.WebAuditor,
      TranscendProduct.ContractScanning,
    ],
  },
  [ScopeName.ManageAccessControl]: {
    dependencies: [ScopeName.ViewEmployees, ScopeName.ViewScopes],
    description: 'Manage what employees in your organization can access within Transcend.',
    title: 'Manage Access Controls',
    type: ScopeType.Modify,
    products: [TranscendProduct.Administration],
  },
  [ScopeName.ManageBilling]: {
    dependencies: [],
    description: 'Manage billing details for your organization.',
    title: 'Manage Billing',
    type: ScopeType.Modify,
    products: [TranscendProduct.Administration],
  },
  [ScopeName.ManageSSO]: {
    dependencies: [ScopeName.ViewSSO],
    description: 'Manage SSO configuration for members of your organization.',
    title: 'Manage SSO',
    type: ScopeType.Modify,
    products: [TranscendProduct.Administration],
  },
  [ScopeName.ManageApiKeys]: {
    dependencies: [ScopeName.ViewApiKeys],
    description:
      'Create, update and delete API keys for programmatic access to your Transcend organization.',
    title: 'Manage API Keys',
    type: ScopeType.Modify,
    products: [TranscendProduct.Administration],
  },
  [ScopeName.ManageOrganizationInfo]: {
    dependencies: [],
    description: 'Edit the top-level organization settings details.',
    title: 'Manage Organization Information',
    type: ScopeType.Modify,
    products: [TranscendProduct.Administration],
  },
  [ScopeName.ManageEmailDomains]: {
    dependencies: [ScopeName.ViewEmailDomains],
    description:
      'Manage the domains from which Transcend can send emails on behalf of your organization.',
    title: 'Manage Email Domains',
    type: ScopeType.Modify,
    products: [
      TranscendProduct.Administration,
      TranscendProduct.DsrAutomation,
      TranscendProduct.PrivacyCenter,
      TranscendProduct.Assessments,
    ],
  },
  [ScopeName.ManageDataSubCategories]: {
    dependencies: [ScopeName.ViewDataSubCategories],
    description: 'Manage data sub categories mentioned in the data inventory',
    title: 'Manage Data Sub Categories',
    type: ScopeType.Modify,
    products: [TranscendProduct.DataInventory],
  },
  [ScopeName.ViewCustomerDataPrivacyRequests]: {
    dependencies: [],
    description: 'Give permissions for an employee to view the data in an access request.',
    title: 'View Customer Data in Privacy Requests',
    type: ScopeType.View,
    products: [TranscendProduct.Administration, TranscendProduct.DsrAutomation],
  },
  [ScopeName.ViewCustomerDataDataMapping]: {
    dependencies: [],
    description:
      'Give permissions for an employee to view the sampled data in the data mapping product.',
    title: 'View Customer Data in Data Mapping',
    type: ScopeType.View,
    products: [
      TranscendProduct.Administration,
      TranscendProduct.StructuredDiscovery,
      TranscendProduct.UnstructuredDiscovery,
    ],
  },
  [ScopeName.ViewApiKeys]: {
    dependencies: [],
    description: 'View the API keys on your account and see what scopes are assigned to them.',
    title: 'View API Keys',
    type: ScopeType.View,
    products: [TranscendProduct.Administration],
  },
  [ScopeName.ViewAuditEvents]: {
    dependencies: [],
    description:
      // eslint-disable-next-line max-len
      'View any audit events made throughout the platform. This includes any of the "Audit Trail" tabs across the Admin Dashboard.',
    title: 'View Audit Events',
    type: ScopeType.View,
    products: [TranscendProduct.Administration],
  },
  [ScopeName.ViewSSO]: {
    dependencies: [],
    description: 'View the SSO configuration for your organization.',
    title: 'View SSO',
    type: ScopeType.View,
    products: [TranscendProduct.Administration],
  },
  [ScopeName.ViewScopes]: {
    dependencies: [ScopeName.ViewEmployees],
    description:
      'View the potential access control scopes that can be assigned to members in the organization.',
    title: 'View Scopes',
    type: ScopeType.View,
    products: [TranscendProduct.Administration],
  },
  [ScopeName.ViewAllActionItems]: {
    dependencies: [],
    description:
      'View all action items in the organization, regardless of assignee or scopes for specific resources. ' +
      'This is necessary when querying API keys via the API.',
    title: 'View All Action Items',
    type: ScopeType.View,
    products: [TranscendProduct.Administration],
  },
  [ScopeName.ManageAllActionItems]: {
    dependencies: [ScopeName.ViewAllActionItems, ScopeName.ViewGlobalAttributes],
    description:
      'Manage all action items in the organization, regardless of assignee or scopes for specific resources. ' +
      'This is necessary when querying API keys via the API.',
    title: 'Manage All Action Items',
    type: ScopeType.Modify,
    products: [TranscendProduct.Administration],
  },
  [ScopeName.ViewEmployees]: {
    dependencies: [],
    description: 'View the list of employees within your organization.',
    title: 'View Employees',
    type: ScopeType.View,
    products: [TranscendProduct.Administration],
  },
  [ScopeName.ViewEmailDomains]: {
    dependencies: [],
    description:
      'View the domains from which Transcend can send emails on behalf of your organization.',
    title: 'View Email Domains',
    type: ScopeType.View,
    products: [
      TranscendProduct.Administration,
      TranscendProduct.DsrAutomation,
      TranscendProduct.PrivacyCenter,
      TranscendProduct.Assessments,
    ],
  },
  [ScopeName.ViewGlobalAttributes]: {
    dependencies: [],
    description: 'View the attribute definition key/value pairs.',
    title: 'View Global Attributes',
    type: ScopeType.View,
    products: [
      TranscendProduct.DsrAutomation,
      TranscendProduct.DataInventory,
      TranscendProduct.ConsentManagement,
      TranscendProduct.StructuredDiscovery,
      TranscendProduct.Administration,
      TranscendProduct.Assessments,
      TranscendProduct.Pathfinder,
      TranscendProduct.PromptManagement,
      TranscendProduct.WebAuditor,
      TranscendProduct.ContractScanning,
    ],
  },
  [ScopeName.ViewLegalHold]: {
    dependencies: [],
    description: 'View the individuals that have been placed on legal holds.',
    title: 'View Legal Hold',
    type: ScopeType.View,
    products: [TranscendProduct.DsrAutomation],
  },
  [ScopeName.ManageLegalHold]: {
    dependencies: [ScopeName.ViewLegalHold],
    description: 'Manage and edit the individuals that have been placed on legal holds.',
    title: 'Manage Legal Holds',
    type: ScopeType.Modify,
    products: [TranscendProduct.DsrAutomation],
  },
  [ScopeName.ManageRequestSecurity]: {
    dependencies: [],
    description: 'ReSign expired request encryption contexts, and data silo contexts.',
    title: 'Manage Request Security',
    type: ScopeType.Modify,
    products: [TranscendProduct.Administration, TranscendProduct.DsrAutomation],
  },
  [ScopeName.ManageRequestCompilation]: {
    dependencies: [ScopeName.ViewRequests, ScopeName.ViewRequestCompilation],
    description:
      'Make changes to the compilation process of a request. This involves changing the status of data silos in your Data Map, as well as editing profiles and files.', // eslint-disable-line max-len
    title: 'Manage Request Compilation',
    type: ScopeType.Modify,
    products: [TranscendProduct.DsrAutomation],
  },
  [ScopeName.ManageAssignedRequests]: {
    dependencies: [ScopeName.ViewAssignedRequests],
    description:
      'Make changes to the compilation process of a request for requests assigned to your or your team. This involves changing the status of data silos in your Data Map, as well as editing profiles and files.', // eslint-disable-line max-len
    title: 'Manage Assigned Privacy Requests',
    type: ScopeType.Modify,
    products: [TranscendProduct.DsrAutomation],
  },
  [ScopeName.ManageAssignedBulkRespond]: {
    dependencies: [],
    description: 'Bulk respond to privacy requests assigned to you or your team.',
    title: 'Manage Assigned Bulk Respond',
    type: ScopeType.Modify,
    products: [TranscendProduct.DsrAutomation],
  },
  [ScopeName.MakeDataSubjectRequest]: {
    dependencies: [ScopeName.ViewDataSubjectRequestSettings, ScopeName.ViewRequestIdentitySettings],
    description: 'Submit a new privacy requests.',
    title: 'Submit New Data Subject Request',
    type: ScopeType.Modify,
    products: [TranscendProduct.DsrAutomation],
  },
  [ScopeName.ManageDataSubjectRequestSettings]: {
    dependencies: [ScopeName.ViewDataSubjectRequestSettings],
    description:
      'Make changes to the request actions that your organization allows, as well as what data subjects you will serve.',
    title: 'Manage Data Subject Request Settings',
    type: ScopeType.Modify,
    products: [TranscendProduct.DsrAutomation],
  },
  [ScopeName.ManageEmailTemplates]: {
    dependencies: [ScopeName.ViewEmailTemplates],
    description:
      'Manage the email communication templates that your organization uses to communicate with your data subjects.',
    title: 'Manage Email Templates',
    type: ScopeType.Modify,
    products: [
      TranscendProduct.DsrAutomation,
      TranscendProduct.PrivacyCenter,
      TranscendProduct.Assessments,
    ],
  },
  [ScopeName.ManageRequestIdentities]: {
    dependencies: [ScopeName.ViewRequestIdentitySettings],
    description:
      'Manage how your organization will verify the identities of new privacy requests, and how that identity will be enriched for all of your data silos to lookup that person.', // eslint-disable-line max-len
    title: 'Manage Request Identity Verification',
    type: ScopeType.Modify,
    products: [TranscendProduct.DsrAutomation],
  },
  [ScopeName.DeployPrivacyCenter]: {
    dependencies: [ScopeName.ManagePrivacyCenter],
    description: 'Launch the Privacy Center on your own domain, and publish new changes.',
    title: 'Publish Privacy Center',
    type: ScopeType.Modify,
    products: [TranscendProduct.PrivacyCenter],
  },
  [ScopeName.ManageDataMap]: {
    dependencies: [ScopeName.ViewDataMap],
    description:
      'Edit the configurations on your data silos and determine what information should be included in a request.',
    title: 'Manage Data Map',
    type: ScopeType.Modify,
    products: [
      TranscendProduct.DsrAutomation,
      TranscendProduct.DataInventory,
      TranscendProduct.StructuredDiscovery,
      TranscendProduct.SiloDiscovery,
      TranscendProduct.UnstructuredDiscovery,
    ],
  },
  [ScopeName.ManagePrivacyCenter]: {
    dependencies: [ScopeName.ViewPrivacyCenter, ScopeName.ManagePolicies],
    description: 'Make changes to the privacy center configuration and policies.',
    title: 'Manage Privacy Center Layout',
    type: ScopeType.Modify,
    products: [TranscendProduct.PrivacyCenter],
  },
  [ScopeName.ManagePolicies]: {
    dependencies: [ScopeName.ViewPolicies],
    description: 'Make changes to the policies defined underneath the privacy center.',
    title: 'Manage Policies',
    type: ScopeType.Modify,
    products: [TranscendProduct.PrivacyCenter],
  },
  [ScopeName.ViewPolicies]: {
    dependencies: [],
    description: 'View the policies defined underneath the privacy center.',
    title: 'View Policies',
    type: ScopeType.View,
    products: [TranscendProduct.PrivacyCenter],
  },
  [ScopeName.ManageIntlMessages]: {
    dependencies: [ScopeName.ViewIntlMessages],
    description: 'Manage the internationalization messages used in the privacy center.',
    title: 'Manage Internationalization Messages',
    type: ScopeType.Modify,
    products: [TranscendProduct.PrivacyCenter, TranscendProduct.ConsentManagement],
  },
  [ScopeName.ViewIntlMessages]: {
    dependencies: [],
    description: 'View the internationalization messages used in the privacy center.',
    title: 'View Internationalization Messages',
    type: ScopeType.View,
    products: [TranscendProduct.PrivacyCenter, TranscendProduct.ConsentManagement],
  },
  [ScopeName.RequestApproval]: {
    dependencies: [
      ScopeName.ViewRequests,
      ScopeName.ViewRequestCompilation,
      ScopeName.ManageRequestCompilation,
    ],
    description:
      'The ability to approve and manage the state of privacy requests, and communicate with the data subject.',
    title: 'Request Approval and Communication',
    type: ScopeType.Modify,
    products: [TranscendProduct.DsrAutomation],
  },
  [ScopeName.ViewDataSubjectRequestSettings]: {
    dependencies: [],
    description:
      'View the privacy request actions settings and data subject categories that your organization supports.',
    title: 'View Data Subject Request Settings',
    type: ScopeType.View,
    products: [TranscendProduct.DsrAutomation],
  },
  [ScopeName.ViewRequestCompilation]: {
    dependencies: [ScopeName.ViewRequests],
    description: 'View the status of requests as they compile across your Data Map.',
    title: 'View the Request Compilation',
    type: ScopeType.View,
    products: [TranscendProduct.DsrAutomation],
  },
  [ScopeName.ViewRequestIdentitySettings]: {
    dependencies: [],
    description: 'View the settings for data subject request identity verification.',
    title: 'View Identity Verification Settings',
    type: ScopeType.View,
    products: [TranscendProduct.DsrAutomation],
  },
  [ScopeName.ViewRequests]: {
    dependencies: [
      ScopeName.ViewGlobalAttributes,
      ScopeName.ViewDataSubjectRequestSettings,
      ScopeName.ViewEmailTemplates,
    ],
    description:
      'View the stream of incoming requests, and any details submit through the form or later enriched.',
    title: 'View Incoming Requests',
    type: ScopeType.View,
    products: [TranscendProduct.DsrAutomation],
  },
  [ScopeName.ViewAssignedRequests]: {
    dependencies: [
      ScopeName.ViewGlobalAttributes,
      ScopeName.ViewDataSubjectRequestSettings,
      ScopeName.ViewEmailTemplates,
    ],
    description:
      // eslint-disable-next-line max-len
      'View the stream of incoming requests assigned to you and your team. You will be able to see any request details submitted through the form or later enriched.',
    title: 'View Assigned Privacy Requests',
    type: ScopeType.View,
    products: [TranscendProduct.DsrAutomation],
  },
  [ScopeName.ViewPrivacyCenter]: {
    dependencies: [],
    description: 'View the full configuration of the privacy center.',
    title: 'View Privacy Center Layout',
    type: ScopeType.View,
    products: [TranscendProduct.PrivacyCenter],
  },
  [ScopeName.ViewEmailTemplates]: {
    dependencies: [],
    description:
      'View the default email templates templates used to communicate with your data subjects.',
    title: 'View Email Templates',
    type: ScopeType.View,
    products: [
      TranscendProduct.DsrAutomation,
      TranscendProduct.PrivacyCenter,
      TranscendProduct.Assessments,
    ],
  },
  [ScopeName.ConnectDataSilos]: {
    dependencies: [ScopeName.ViewDataMap, ScopeName.ManageDataMap, ScopeName.ViewEmailTemplates],
    description: 'Connect new data silos to your Data Map.',
    title: 'Connect Data Silos',
    products: [
      TranscendProduct.DsrAutomation,
      TranscendProduct.SiloDiscovery,
      TranscendProduct.StructuredDiscovery,
      TranscendProduct.UnstructuredDiscovery,
    ],
    type: ScopeType.Modify,
  },
  [ScopeName.ManageDataInventory]: {
    dependencies: [ScopeName.ViewDataInventory],
    description:
      // eslint-disable-next-line max-len
      'Ability to manage and edit everything in the data mapping product. Includes the data inventory, ROPE, and content classification views.',
    title: 'Manage Data Inventory',
    type: ScopeType.Modify,
    products: [
      TranscendProduct.DataInventory,
      TranscendProduct.StructuredDiscovery,
      TranscendProduct.SiloDiscovery,
      TranscendProduct.UnstructuredDiscovery,
    ],
  },
  [ScopeName.ManageAssignedDataInventory]: {
    dependencies: [ScopeName.ViewAssignedDataInventory],
    description:
      "Manage the data inventory rows in your organization's Data Map that are assigned to you or your team.",
    title: 'Manage Assigned Data Inventory',
    type: ScopeType.Modify,
    products: [
      TranscendProduct.DataInventory,
      TranscendProduct.StructuredDiscovery,
      TranscendProduct.SiloDiscovery,
      TranscendProduct.UnstructuredDiscovery,
    ],
  },
  [ScopeName.ManageAssignedIntegrations]: {
    dependencies: [ScopeName.ViewAssignedIntegrations],
    description:
      "Manage the integrations in your organization's Data Map that are assigned to you or your team.",
    title: 'Manage Assigned Integrations',
    type: ScopeType.Modify,
    products: [
      TranscendProduct.DsrAutomation,
      TranscendProduct.DataInventory,
      TranscendProduct.StructuredDiscovery,
      TranscendProduct.SiloDiscovery,
      TranscendProduct.UnstructuredDiscovery,
    ],
  },
  [ScopeName.ViewDataMap]: {
    dependencies: [ScopeName.ViewGlobalAttributes],
    description:
      "View your organization's Data Map and see the configuration settings for each action your support.",
    title: 'View Data Map',
    type: ScopeType.View,
    products: [
      TranscendProduct.DsrAutomation,
      TranscendProduct.DataInventory,
      TranscendProduct.StructuredDiscovery,
      TranscendProduct.SiloDiscovery,
      TranscendProduct.UnstructuredDiscovery,
    ],
  },
  [ScopeName.ViewAssignedIntegrations]: {
    dependencies: [ScopeName.ViewGlobalAttributes],
    description:
      "View the integrations in your organization's Data Map that are assigned to you or your team.",
    title: 'View Assigned Integrations',
    type: ScopeType.View,
    products: [
      TranscendProduct.DsrAutomation,
      TranscendProduct.DataInventory,
      TranscendProduct.StructuredDiscovery,
      TranscendProduct.SiloDiscovery,
      TranscendProduct.UnstructuredDiscovery,
    ],
  },
  [ScopeName.ViewAssignedDataInventory]: {
    dependencies: [ScopeName.ViewGlobalAttributes, ScopeName.ViewDataSubjectRequestSettings],
    description:
      'Ability to view the resources in the data mapping product that are assigned to your or your team.',
    title: 'View Assigned Data Inventory',
    type: ScopeType.View,
    products: [
      TranscendProduct.DataInventory,
      TranscendProduct.StructuredDiscovery,
      TranscendProduct.SiloDiscovery,
      TranscendProduct.UnstructuredDiscovery,
    ],
  },
  [ScopeName.ViewDataInventory]: {
    dependencies: [
      ScopeName.ViewDataMap,
      ScopeName.ViewGlobalAttributes,
      ScopeName.ViewDataSubjectRequestSettings,
    ],
    description:
      // eslint-disable-next-line max-len
      'Ability to view all of the data mapping product. Includes the data inventory, ROPA, and content classification views.',
    title: 'View Data Inventory',
    type: ScopeType.View,
    products: [
      TranscendProduct.DataInventory,
      TranscendProduct.StructuredDiscovery,
      TranscendProduct.SiloDiscovery,
      TranscendProduct.UnstructuredDiscovery,
    ],
  },
  [ScopeName.ManageConsentManager]: {
    dependencies: [
      ScopeName.ViewConsentManager,
      ScopeName.ManageDataFlow,
      ScopeName.ManageConsentManagerDisplaySettings,
      ScopeName.ManageConsentManagerDeveloperSettings,
      ScopeName.DeployConsentManager,
      ScopeName.DeployTestConsentManager,
      ScopeName.ViewDataFlow,
    ],
    description: 'Manage & deploy the consent manager changes to your websites.',
    title: 'Manage Consent Manager',
    type: ScopeType.Modify,
    products: [TranscendProduct.ConsentManagement],
  },
  [ScopeName.ManageConsentManagerDeveloperSettings]: {
    dependencies: [ScopeName.ViewConsentManager],
    description:
      'Manage the developer settings for the Consent Manager. ' +
      'This does not allow for clicking the "Set Changes Live" button.',
    title: 'Manage Consent Manager Developer Settings',
    type: ScopeType.Modify,
    products: [TranscendProduct.ConsentManagement],
  },
  [ScopeName.ManageConsentManagerDisplaySettings]: {
    dependencies: [ScopeName.ViewConsentManager],
    description:
      'Manage the display settings for the consent manager. This includes messages, styles and other UI settings.',
    title: 'Manage Consent Manager Display Settings',
    type: ScopeType.Modify,
    products: [TranscendProduct.ConsentManagement],
  },
  [ScopeName.DeployTestConsentManager]: {
    dependencies: [ScopeName.ViewConsentManager],
    description:
      // eslint-disable-next-line max-len
      'Ability to publish changes to the test Consent Manager bundle. This changes the code contents of airgap.js and attempts to invalidate the CDN.',
    title: 'Deploy Test Consent Manager',
    type: ScopeType.Modify,
    products: [TranscendProduct.ConsentManagement],
  },
  [ScopeName.DeployConsentManager]: {
    dependencies: [ScopeName.ViewConsentManager, ScopeName.DeployTestConsentManager],
    description:
      // eslint-disable-next-line max-len
      'Ability to publish changes to the production and test Consent Manager bundle. This changes the code contents of airgap.js and attempts to invalidate the CDN.',
    title: 'Deploy Consent Manager',
    type: ScopeType.Modify,
    products: [TranscendProduct.ConsentManagement],
  },
  [ScopeName.ManageAssignedConsentManager]: {
    dependencies: [ScopeName.ViewAssignedConsentManager],
    description: 'Manage Data Flows & Cookies assigned to you or your team.',
    title: 'Manage Assigned Consent Manager',
    type: ScopeType.Modify,
    products: [TranscendProduct.ConsentManagement],
  },
  [ScopeName.ManageDataFlow]: {
    dependencies: [ScopeName.ViewDataFlow],
    description:
      'Ability to manage and delete Data Flows and Cookies within the Consent Manager product.',
    title: 'Manage Data Flows',
    type: ScopeType.Modify,
    products: [TranscendProduct.ConsentManagement],
  },
  [ScopeName.ViewDataFlow]: {
    dependencies: [ScopeName.ViewConsentManager],
    description: 'View Data Flows (tracking purpose maps, site scans)',
    title: 'View Data Flows',
    type: ScopeType.View,
    products: [TranscendProduct.ConsentManagement],
  },
  [ScopeName.ViewAssignedConsentManager]: {
    dependencies: [ScopeName.ViewGlobalAttributes],
    description: 'View Data Flows and Cookies assigned to you or your team.',
    title: 'View Assigned Consent Manager',
    type: ScopeType.View,
    products: [TranscendProduct.ConsentManagement],
  },
  [ScopeName.ViewConsentManager]: {
    title: 'View Consent Manager',
    type: ScopeType.View,
    dependencies: [ScopeName.ViewGlobalAttributes, ScopeName.ViewManagedConsentDatabaseAdminApi],
    description: 'View the consent manager configuration.',
    products: [TranscendProduct.ConsentManagement],
  },
  [ScopeName.ViewAssessments]: {
    title: 'View Assessments',
    dependencies: [],
    description: 'View the assessments and assessment templates.',
    type: ScopeType.View,
    products: [TranscendProduct.Assessments, TranscendProduct.DataInventory],
  },
  [ScopeName.ManageAssessments]: {
    title: 'Manage Assessments',
    dependencies: [ScopeName.ViewAssessments],
    description: 'Manage and edit assessments and assessment templates',
    type: ScopeType.Modify,
    products: [TranscendProduct.Assessments, TranscendProduct.DataInventory],
  },
  [ScopeName.ViewAssignedAssessments]: {
    title: 'View Assigned Assessments',
    dependencies: [],
    description: 'View the assigned assessments forms.',
    type: ScopeType.View,
    products: [TranscendProduct.Assessments, TranscendProduct.DataInventory],
  },
  [ScopeName.ManageAssignedAssessments]: {
    title: 'Manage Assigned Assessments',
    dependencies: [ScopeName.ViewAssignedAssessments],
    description: 'Manage and edit the assigned assessments.',
    type: ScopeType.Modify,
    products: [TranscendProduct.Assessments, TranscendProduct.DataInventory],
  },
  [ScopeName.ViewPathfinder]: {
    title: 'View Pathfinder',
    dependencies: [ScopeName.ViewGlobalAttributes],
    description: 'View the pathfinder settings.',
    type: ScopeType.View,
    products: [TranscendProduct.Pathfinder],
  },
  [ScopeName.ManagePathfinder]: {
    title: 'Manage Pathfinder',
    dependencies: [ScopeName.ViewPathfinder],
    description: 'Manage the pathfinder settings under that pathfinder side menu',
    type: ScopeType.Modify,
    products: [TranscendProduct.Pathfinder],
  },
  [ScopeName.ViewContractScanning]: {
    title: 'View Contract Scanning',
    dependencies: [ScopeName.ViewGlobalAttributes],
    description: 'View the contract scanning side menu - including setting and contracts.',
    type: ScopeType.View,
    products: [TranscendProduct.ContractScanning],
  },
  [ScopeName.ManageContractScanning]: {
    title: 'Manage Contract Scanning',
    dependencies: [ScopeName.ViewContractScanning],
    description: 'Upload and manage contracts under the contract scanning side menu',
    type: ScopeType.Modify,
    products: [TranscendProduct.ContractScanning],
  },
  [ScopeName.ViewPrompts]: {
    title: 'View Prompts',
    dependencies: [ScopeName.ViewGlobalAttributes],
    description: 'View the prompts and prompt templates.',
    type: ScopeType.View,
    products: [TranscendProduct.PromptManagement],
  },
  [ScopeName.ManagePrompts]: {
    title: 'Manage Prompts',
    dependencies: [ScopeName.ViewPrompts],
    description: 'Manage and edit prompts and prompt templates',
    type: ScopeType.Modify,
    products: [TranscendProduct.PromptManagement],
  },
  [ScopeName.ViewPromptRuns]: {
    title: 'View Prompt Runs',
    dependencies: [ScopeName.ViewPrompts],
    description: 'View the output run results for prompts.',
    type: ScopeType.View,
    products: [TranscendProduct.PromptManagement],
  },
  [ScopeName.ManagePromptRuns]: {
    title: 'Manage Prompt Runs',
    dependencies: [ScopeName.ViewPromptRuns, ScopeName.ViewPrompts],
    description: 'Manage, edit and create prompt run results',
    type: ScopeType.Modify,
    products: [TranscendProduct.PromptManagement, TranscendProduct.Pathfinder],
  },
  [ScopeName.ViewCodeScanning]: {
    title: 'View Code Scanning',
    dependencies: [ScopeName.ViewGlobalAttributes],
    description: 'View the code scanning tables.',
    type: ScopeType.View,
    products: [TranscendProduct.DataInventory, TranscendProduct.ConsentManagement],
  },
  [ScopeName.ManageCodeScanning]: {
    title: 'Manage Code Scanning',
    dependencies: [ScopeName.ViewCodeScanning],
    description: 'Manage, edit and create records in code scanning',
    type: ScopeType.Modify,
    products: [TranscendProduct.DataInventory, TranscendProduct.ConsentManagement],
  },
  [ScopeName.ExecutePrompt]: {
    title: 'Execute Prompt',
    dependencies: [ScopeName.ViewPromptRuns, ScopeName.ViewPrompts],
    description: 'Ability to execute a prompt and view the outputs',
    type: ScopeType.Modify,
    products: [TranscendProduct.PromptManagement],
  },
  [ScopeName.ViewAuditorRuns]: {
    title: 'View Auditor Runs',
    dependencies: [],
    description: 'View the output run results for Auditor.',
    type: ScopeType.View,
    products: [TranscendProduct.WebAuditor],
  },
  [ScopeName.ManageAuditor]: {
    title: 'Manage Auditor Runs and Schedules',
    dependencies: [ScopeName.ViewAuditorRuns],
    description: 'Manage, edit and create prompt run results',
    type: ScopeType.Modify,
    products: [TranscendProduct.WebAuditor],
  },
  [ScopeName.ExecuteAuditor]: {
    title: 'Execute Auditor',
    dependencies: [ScopeName.ViewAuditorRuns],
    description: 'Ability to execute or schedule Auditor and view the outputs',
    type: ScopeType.Modify,
    products: [TranscendProduct.WebAuditor],
  },
  [ScopeName.ApprovePrompts]: {
    title: 'Approve Prompts',
    dependencies: [ScopeName.ViewPrompts],
    description: 'Approve the prompts and prompt templates',
    type: ScopeType.Modify,
    products: [TranscendProduct.PromptManagement],
  },
  [ScopeName.ManageActionItemCollections]: {
    title: 'Manage Action Item Collections',
    dependencies: [],
    description: 'Manage and edit action item collections',
    type: ScopeType.Modify,
    products: [TranscendProduct.Administration],
  },
  [ScopeName.ViewManagedConsentDatabaseAdminApi]: {
    title: 'View Managed Consent Database Admin API',
    dependencies: [],
    description:
      'Ability to query user consent preferences with the Managed Consent Database Admin API',
    type: ScopeType.View,
    products: [TranscendProduct.ConsentManagement, TranscendProduct.PreferenceManagement],
  },
  [ScopeName.ManageStoredPreferences]: {
    title: 'Modify User Stored Preferences',
    dependencies: [ScopeName.ViewManagedConsentDatabaseAdminApi],
    description: 'Ability to make updates to user stored consent preferences',
    type: ScopeType.Modify,
    products: [TranscendProduct.ConsentManagement, TranscendProduct.PreferenceManagement],
  },
  [ScopeName.ManagePreferenceStoreSettings]: {
    title: 'Manage Preference Store Settings',
    dependencies: [ScopeName.ViewPreferenceStoreSettings],
    description: 'Ability to make updates to preference store settings',
    type: ScopeType.Modify,
    products: [TranscendProduct.PreferenceManagement],
  },
  [ScopeName.ViewPreferenceStoreSettings]: {
    title: 'View Preference Store Settings',
    dependencies: [ScopeName.ViewPreferenceStoreSettings],
    description: 'Ability to view preference store settings',
    type: ScopeType.Modify,
    products: [TranscendProduct.PreferenceManagement],
  },
  [ScopeName.LLMLogTransfer]: {
    title: 'LLM Log Transfer',
    dependencies: [ScopeName.ManageDataInventory],
    description: 'Ability to transfer logs from LLM to Transcend',
    type: ScopeType.Modify,
    products: [TranscendProduct.StructuredDiscovery, TranscendProduct.UnstructuredDiscovery],
  },
  [ScopeName.ManageWorkflows]: {
    title: 'Manage Workflows',
    description: 'Ability to make updates to Workflows and their settings',
    dependencies: [],
    type: ScopeType.Modify,
    products: [TranscendProduct.DsrAutomation],
  },
  [ScopeName.ViewDataSubCategories]: {
    title: 'View Data Sub Categories',
    dependencies: [],
    description: 'View Data Sub Categories from Data Inventory',
    type: ScopeType.View,
    products: [TranscendProduct.DataInventory],
  },
  [ScopeName.GeneratePreferenceAccessTokens]: {
    title: 'Generate Preference Access Tokens',
    dependencies: [],
    description: 'Ability to generate access tokens for user preferences',
    type: ScopeType.Modify,
    products: [TranscendProduct.PreferenceManagement, TranscendProduct.PrivacyCenter],
  },
  [ScopeName.ViewRules]: {
    title: 'View Rules',
    dependencies: [],
    description: 'View rules, their triggers, actions, and execution history.',
    type: ScopeType.View,
    products: [TranscendProduct.RulesAutomation],
  },
  [ScopeName.ManageRules]: {
    title: 'Manage Rules',
    dependencies: [ScopeName.ViewRules],
    description: 'Create, update, and delete rules and their configurations.',
    type: ScopeType.Modify,
    products: [TranscendProduct.RulesAutomation],
  },
  [ScopeName.ViewAssignedRules]: {
    title: 'View Assigned Rules',
    dependencies: [],
    description: 'View rules assigned to you or your team.',
    type: ScopeType.View,
    products: [TranscendProduct.RulesAutomation],
  },
  [ScopeName.ManageAssignedRules]: {
    title: 'Manage Assigned Rules',
    dependencies: [ScopeName.ViewAssignedRules],
    description: 'Manage and edit rules assigned to you or your team.',
    type: ScopeType.Modify,
    products: [TranscendProduct.RulesAutomation],
  },
  [ScopeName.ExecuteRules]: {
    title: 'Execute Rules',
    dependencies: [ScopeName.ViewRules],
    description: 'Trigger rule execution and view the outputs.',
    type: ScopeType.Modify,
    products: [TranscendProduct.RulesAutomation],
  },
};

export const TRANSCEND_SCOPES: {
  [name in ScopeName]: ScopeDefinition;
} = {
  [ScopeName.ReadOnly]: {
    dependencies: getEntries(SCOPES_WITHOUT_VIEW_ONLY)
      .filter(([, v]) => v.type === ScopeType.View)
      .map(([k]) => k),
    description: 'Access is granted to all of the scopes of type "View".',
    title: 'View Only',
    type: ScopeType.View,
    products: getValues(TranscendProduct),
  },
  ...SCOPES_WITHOUT_VIEW_ONLY,
};

/* eslint-enable max-lines */
