/**
 * The type of actionItem a person will be notified to fulfill
 */
export enum ActionItemCode {
  /**
   * - The action is not connected to any data silos or data points
   */
  ActionMissingSilos = 'ACTION_MISSING_SILOS',
  /**
   * API Keys that are too old (expired)
   */
  ApiKeyStale = 'API_KEY_STALE',
  /**
   * An assessment has been assigned for completion
   */
  AssessmentFormAssigned = 'ASSESSMENT_FORM_ASSIGNED',
  /**
   * An assessment needs review
   */
  AssessmentFormNeedsReview = 'ASSESSMENT_FORM_NEEDS_REVIEW',
  /**
   * Someone marked a request as requiring manual review
   */
  RequestDataSiloMarkedActionable = 'REQUEST_DATA_SILO_MARKED_ACTIONABLE',
  /**
   * There are files for a data silo in a request that require manual review
   */
  RequestDataSiloFilesNeedReview = 'REQUEST_DATA_SILO_FILES_NEED_REVIEW',
  /**
   * - Unread emails with the data subject
   */
  CommunicationUnread = 'COMMUNICATION_UNREAD',
  /**
   * - Unread emails with a vendor
   */
  DataSiloCommunicationUnread = 'DATA_SILO_COMMUNICATION_UNREAD',
  /**
   * - The description is the empty string
   * - There is no data collection
   */
  DataPoint = 'DATA_POINT',
  /**
   * - Data point has missing fields
   */
  DataPointMissingFields = 'DATA_POINT_MISSING_FIELDS',
  /**
   * - Data Silos not are EXPIRED, PERMISSIONS_UPDATED or misconfigured and are not assigned yet
   */
  DataSiloNeedsReconnect = 'DATA_SILO_NEEDS_RECONNECT',
  /**
   * - Data Silos not are EXPIRED, PERMISSIONS_UPDATED or misconfigured and are assigned
   */
  DataSiloNeedsReconnectAssigned = 'DATA_SILO_NEEDS_RECONNECT_ASSIGNED',
  /**
   * - Data Silos that are not yet brought online and launched into production and are not assigned yet
   */
  DataSiloNotConfigured = 'DATA_SILO_NOT_CONFIGURED',
  /**
   * - Data Silos that are not yet brought online and launched into production and are assigned
   */
  DataSiloNotConfiguredAssigned = 'DATA_SILO_NOT_CONFIGURED_ASSIGNED',
  /**
   * - Data Silos that are live and have no configured identifiers are invalid
   */
  DataSiloMissingIdentifiers = 'DATA_SILO_MISSING_IDENTIFIERS',
  /**
   * - Lookup processes have errored out and are no longer indexing
   */
  LookupProcessesWithErrors = 'LOOKUP_PROCESSES_WITH_ERRORS',
  /**
   * Manual entry is required for prompt a person data silo
   * or a file was marked as requiring action item.
   */
  DataSilosNeedingManualEntry = 'DATA_SILOS_NEEDING_MANUAL_ENTRY',
  /**
   * - A profile running a specific datapoint encountered an error
   */
  ProfileDataPointStatus = 'PROFILE_DATA_POINT_STATUS',
  /**
   * - The request is nearing its expiry time
   */
  RequestExpiry = 'REQUEST_EXPIRY',
  /**
   * - A request data silo that has thrown an error
   */
  RequestDataSiloError = 'REQUEST_DATA_SILO_ERROR',
  /**
   * - enricher that has an error
   */
  RequestEnricherError = 'REQUEST_ENRICHER_ERROR',
  /**
   * RequestIdentifier needs to be manually verified
   */
  RequestIdentifierNeedsVerification = 'REQUEST_IDENTIFIER_NEEDS_VERIFICATION',
  /**
   * - Enrichers of type PERSON that are awaiting manual entry
   */
  RequestEnricherPersonNeedsManualEntry = 'REQUEST_ENRICHER_PERSON_NEEDS_MANUAL_ENTRY',
  /**
   * - request needs approvals
   */
  RequestActionableStatus = 'REQUEST_ACTIONABLE_STATUS',
  /**
   * - request is on hold
   */
  RequestOnHold = 'REQUEST_ON_HOLD',
  /**
   * - A user who hasn't been notified that they've been added to an org.
   */
  UserAwaitingNotification = 'USER_AWAITING_NOTIFICATION',
  /**
   * - A user created with no scopes or no teams
   */
  UserNeedsConfiguration = 'USER_NEEDS_CONFIGURATION',
  /**
   * - Old Sombra version upgrade reminder
   */
  SombraVersionUpgrade = 'SOMBRA_VERSION_UPGRADE',
  /**
   * - Sombra key rotation reminder
   */
  SombraNeedsKeyRotation = 'SOMBRA_NEEDS_KEY_ROTATION',
  /**
   * - Data Flows that need review
   */
  DataFlowNeedsReview = 'DATA_FLOW_NEEDS_REVIEW',
  /**
   * - Data Flows that have been assigned for review
   */
  DataFlowAssignedForReview = 'DATA_FLOW_ASSIGNED_FOR_REVIEW',
  /**
   * - Cookies that need review
   */
  CookieNeedsReview = 'COOKIE_NEEDS_REVIEW',
  /**
   * - Cookies that have been assigned for review
   */
  CookieAssignedForReview = 'COOKIE_ASSIGNED_FOR_REVIEW',
  /**
   * - Consent Manager bundle version can be upgraded
   */
  ConsentManagerVersionUpgrade = 'CONSENT_MANAGER_VERSION_UPGRADE',
  /**
   * - Lookup processes have errored out and are no longer indexing
   */
  PluginsWithErrors = 'PLUGINS_WITH_ERRORS',
  /**
   * onboarding action item, user-defined with no query handlers
   */
  Onboarding = 'ONBOARDING',
  /**
   * request that has been assigned to a user
   */
  RequestAssignedToUser = 'REQUEST_ASSIGNED_TO_USER',
  /**
   * business entity needing documentation
   */
  BusinessEntityNeedsDocumentation = 'BUSINESS_ENTITY_NEEDS_DOCUMENTATION',
  /**
   * A database datapoint has queries that need approval
   */
  DataPointDatabaseQueryNeedsApproval = 'DATA_POINT_DATABASE_QUERY_NEEDS_APPROVAL',
}

/**
 * Possible values for action item priority override
 */
export enum ActionItemPriorityOverride {
  WontDo = 'WONT_DO',
  Low = 'LOW',
  Medium = 'MEDIUM',
  High = 'HIGH',
  Critical = 'CRITICAL',
}
