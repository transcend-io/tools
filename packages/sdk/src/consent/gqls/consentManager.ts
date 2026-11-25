import { gql } from 'graphql-request';

// ---- FETCH_CONSENT_MANAGER_ID query ----

/** Full response from FETCH_CONSENT_MANAGER_ID */
export interface TranscendCliFetchConsentManagerIdResponse {
  /** Consent manager wrapper */
  consentManager: {
    /** Consent manager object */
    consentManager: {
      /** Consent manager / airgap bundle ID */
      id: string;
    };
  };
}

export const FETCH_CONSENT_MANAGER_ID = gql`
  query TranscendCliFetchConsentManagerId {
    consentManager {
      consentManager {
        id
      }
    }
  }
`;

// ---- FETCH_CONSENT_MANAGER query ----

/** Consent manager configuration */
export interface TranscendConsentManagerConfigGql {
  /** Configured domains */
  domains: string[];
  /** Consent precedence setting */
  consentPrecedence: string;
  /** Unknown request policy */
  unknownRequestPolicy: string;
  /** Unknown cookie policy */
  unknownCookiePolicy: string;
  /** Sync endpoint URL */
  syncEndpoint: string;
  /** Telemetry partitioning strategy */
  telemetryPartitioning: string;
  /** Signed IAB agreement status */
  signedIabAgreement: string;
  /** Sync groups setting */
  syncGroups: string;
  /** Partition parameter */
  partition: string;
}

/** Consent manager node */
export interface TranscendConsentManagerGql {
  /** Consent manager / airgap bundle ID */
  id: string;
  /** When true, the bundle is in reporting-only mode (enforcement off) */
  off: boolean;
  /** Production bundle URL */
  bundleURL: string;
  /** Test bundle URL */
  testBundleURL: string;
  /** Configuration settings */
  configuration: TranscendConsentManagerConfigGql;
  /** Partition info */
  partition?: {
    /** Partition value */
    partition: string;
  };
}

/** Full response from FETCH_CONSENT_MANAGER */
export interface TranscendCliFetchConsentManagerResponse {
  /** Consent manager wrapper */
  consentManager: {
    /** Consent manager object */
    consentManager: TranscendConsentManagerGql;
  };
}

export const FETCH_CONSENT_MANAGER = gql`
  query TranscendCliFetchConsentManager {
    consentManager {
      consentManager {
        id
        off
        bundleURL
        testBundleURL
        webhookUrl
        configuration {
          domains
          consentPrecedence
          unknownRequestPolicy
          unknownCookiePolicy
          syncEndpoint
          telemetryPartitioning
          signedIabAgreement
          syncGroups
          partition
        }
        partition {
          partition
        }
      }
    }
  }
`;

// ---- FETCH_CONSENT_MANAGER_THEME query ----

/** Consent manager theme fields */
export interface TranscendConsentManagerThemeGql {
  /** Primary color */
  primaryColor: string;
  /** Font color */
  fontColor: string;
  /** Privacy policy URL */
  privacyPolicy?: string;
  /** Auto-prompt setting */
  prompt: number;
}

/** Full response from FETCH_CONSENT_MANAGER_THEME */
export interface TranscendCliFetchConsentManagerThemeResponse {
  /** Theme wrapper */
  consentManagerTheme: {
    /** Theme object */
    theme: TranscendConsentManagerThemeGql;
  };
}

export const FETCH_CONSENT_MANAGER_THEME = gql`
  query TranscendCliFetchConsentManagerTheme($airgapBundleId: ID!) {
    consentManagerTheme(input: { airgapBundleId: $airgapBundleId }) {
      theme {
        primaryColor
        fontColor
        privacyPolicy
        prompt
      }
    }
  }
`;

// ---- Consent Manager mutations ----

/** Shared response type for mutations that return only clientMutationId */
export interface TranscendClientMutationIdResponse {
  /** Mutation result keyed by mutation name */
  [key: string]: {
    /** Client mutation ID */
    clientMutationId: string | null;
  };
}

export const CREATE_CONSENT_MANAGER = gql`
  mutation TranscendCliCreateConsentManager($privacyCenterId: ID!) {
    createConsentManager(input: { privacyCenterId: $privacyCenterId }) {
      consentManager {
        id
      }
    }
  }
`;

export const UPDATE_CONSENT_MANAGER_VERSION = gql`
  mutation TranscendCliUpdateConsentManager($airgapBundleId: ID!, $version: String!) {
    updateConsentManager(id: $airgapBundleId, input: { version: $version }) {
      clientMutationId
    }
  }
`;

export const UPDATE_CONSENT_MANAGER_DEPLOYMENT_WEBHOOK = gql`
  mutation TranscendCliUpdateConsentManagerDeploymentWebhook(
    $airgapBundleId: ID!
    $input: UpdateConsentManagerInput!
  ) {
    updateConsentManager(id: $airgapBundleId, input: $input) {
      clientMutationId
    }
  }
`;

export const UPDATE_CONSENT_MANAGER_TO_LATEST = gql`
  mutation TranscendCliUpdateConsentManagerToLatest(
    $airgapBundleId: ID!
    $bundleType: ConsentBundleType!
  ) {
    updateConsentManagerToLatestVersion(id: $airgapBundleId, input: { bundleType: $bundleType }) {
      clientMutationId
    }
  }
`;

export const DEPLOY_CONSENT_MANAGER = gql`
  mutation TranscendCliDeployConsentManager($airgapBundleId: ID!, $bundleType: ConsentBundleType!) {
    deployConsentManagerBundle(id: $airgapBundleId, input: { bundleType: $bundleType }) {
      clientMutationId
    }
  }
`;

/** Response from CONSENT_MANAGER_CONFIGURATION_JSON */
export interface TranscendCliConsentManagerConfigurationJsonResponse {
  /** Configuration JSON wrapper */
  consentManagerConfigurationJson: {
    /** Nested configuration record */
    consentManagerConfigurationJson: {
      /** Airgap bundle ID */
      id: string;
      /** Pending production configuration JSON */
      configurationJson: string;
      /** Pending test configuration JSON */
      testConfigurationJson: string;
      /** Whether TCF is enabled */
      useIabFramework: boolean;
    };
  };
}

export const CONSENT_MANAGER_CONFIGURATION_JSON = gql`
  query TranscendCliConsentManagerConfigurationJson($id: ID!) {
    consentManagerConfigurationJson(id: $id) {
      consentManagerConfigurationJson {
        id
        configurationJson
        testConfigurationJson
        useIabFramework
      }
    }
  }
`;

/** One airgap bundle version node */
export interface TranscendCliAirgapBundleVersionNode {
  /** Serialized core module config at deploy time */
  coreConfig: string | null;
  /** When this version was published */
  createdAt: string;
}

/** Response from AIRGAP_BUNDLE_VERSIONS */
export interface TranscendCliAirgapBundleVersionsResponse {
  /** Version list */
  airgapBundleVersions: {
    /** Most recent versions first */
    nodes: TranscendCliAirgapBundleVersionNode[];
  };
}

export const AIRGAP_BUNDLE_VERSIONS = gql`
  query TranscendCliAirgapBundleVersions(
    $id: ID!
    $first: Int!
    $input: AirgapBundleVersionsInput!
  ) {
    airgapBundleVersions(id: $id, first: $first, input: $input) {
      nodes {
        coreConfig
        createdAt
      }
    }
  }
`;

export const UPDATE_CONSENT_MANAGER_DOMAINS = gql`
  mutation TranscendCliUpdateConsentManagerDomains($airgapBundleId: ID!, $domains: [String!]!) {
    updateConsentManagerDomains(input: { id: $airgapBundleId, domains: $domains }) {
      clientMutationId
    }
  }
`;

export const UPDATE_CONSENT_MANAGER_PARTITION = gql`
  mutation TranscendCliUpdateConsentManagerPartition($airgapBundleId: ID!, $partitionId: ID!) {
    updateConsentManagerPartition(input: { id: $airgapBundleId, partitionId: $partitionId }) {
      clientMutationId
    }
  }
`;

export const UPDATE_LOAD_OPTIONS = gql`
  mutation TranscendCliUpdateLoadOptions($input: UpdateLoadOptionsInput!) {
    updateLoadOptions(input: $input) {
      clientMutationId
    }
  }
`;

export const TOGGLE_UNKNOWN_REQUEST_POLICY = gql`
  mutation TranscendCliToggleUnknownRequestPolicy($input: ToggleUnknownRequestPolicyInput!) {
    toggleUnknownRequestPolicy(input: $input) {
      clientMutationId
    }
  }
`;

export const TOGGLE_UNKNOWN_COOKIE_POLICY = gql`
  mutation TranscendCliToggleUnknownCookiePolicy($input: ToggleUnknownCookiePolicyInput!) {
    toggleUnknownCookiePolicy(input: $input) {
      clientMutationId
    }
  }
`;

export const TOGGLE_TELEMETRY_PARTITION_STRATEGY = gql`
  mutation TranscendCliToggleTelemetryPartitionStrategy(
    $input: ToggleTelemetryPartitionStrategyInput!
  ) {
    toggleTelemetryPartitioning(input: $input) {
      clientMutationId
    }
  }
`;

export const TOGGLE_CONSENT_PRECEDENCE = gql`
  mutation TranscendCliToggleConsentPrecedence($input: ToggleConsentPrecedenceInput!) {
    toggleConsentPrecedence(input: $input) {
      clientMutationId
    }
  }
`;

export const TOGGLE_CONSENT_MANAGER_ENFORCEMENT = gql`
  mutation TranscendCliToggleConsentManagerEnforcement(
    $input: ToggleConsentManagerEnforcementInput!
  ) {
    toggleConsentManagerEnforcement(input: $input) {
      clientMutationId
    }
  }
`;

export const UPDATE_CONSENT_MANAGER_THEME = gql`
  mutation TranscendCliUpdateConsentManagerTheme($input: UpdateConsentManagerThemeInput!) {
    updateConsentManagerTheme(input: $input) {
      clientMutationId
    }
  }
`;

export const FETCH_CONSENT_UI_VARIANTS = gql`
  query TranscendCliConsentUiVariants($airgapBundleId: ID!, $first: Int!, $offset: Int!) {
    consentUiVariants(input: { airgapBundleId: $airgapBundleId }, first: $first, offset: $offset) {
      totalCount
      nodes {
        id
        name
        slug
        description
        status
        locales
        configuration {
          firstLayerConfig {
            showCloseButton
            alphaMask
            footer {
              showTranscendBadge
              showGpcDetected
              showLocalePicker
            }
            links
            buttons {
              type
              action
            }
            showHeader
          }
          secondLayerConfig {
            showCloseButton
            alphaMask
            footer {
              showTranscendBadge
              showGpcDetected
              showLocalePicker
            }
            links
            buttons {
              type
              action
            }
            showBulkActions
            closeAfterBulkAction
            showPurposeDescriptions
            showToggleText
            showToggleIcon
          }
          defaultLocale
        }
        theme {
          id
          slug
        }
        userFlow
      }
    }
  }
`;

export const FETCH_CONSENT_UI_THEMES = gql`
  query TranscendCliConsentUiThemes($airgapBundleId: ID!, $first: Int!, $offset: Int!) {
    consentUiThemes(input: { airgapBundleId: $airgapBundleId }, first: $first, offset: $offset) {
      totalCount
      nodes {
        id
        name
        slug
        configuration {
          buttonThemes {
            backgroundColor
            backgroundHoverColor
            textColor
            textHoverColor
            borderRadius
            borderColor
            borderHoverColor
            linkColor
            linkHoverColor
            linkUnderline
          }
          firstLayer {
            alwaysShowScrollbar
            background {
              backgroundColor
            }
            buttons
            closeButton {
              backgroundColor
              backgroundHoverColor
              borderRadius
              borderColor
              borderHoverColor
              iconColor
              iconHoverColor
            }
            container {
              backgroundColor
              borderRadius
              borderColor
            }
            contentFlow
            contentLayout {
              breakpoint {
                value
                unit
              }
              maxWidths {
                flow
                width
              }
              fullWidth
            }
            cookieAndPrivacyPolicy {
              linkColor
              linkUnderline
            }
            poweredByTranscend {
              linkColor
            }
            description {
              textColor
              linkColor
              linkUnderline
            }
            footer {
              backgroundColor
              localePickerColor
            }
            header {
              textColor
              logoPosition
              logoImageUrl
            }
            horizontalAlign
            verticalAlign
          }
          secondLayer {
            alwaysOnText {
              textColor
            }
            alwaysShowScrollbar
            background {
              backgroundColor
            }
            bulkActionButtons
            buttons
            cardTitle {
              textColor
            }
            caretIcon {
              iconColor
            }
            closeButton {
              backgroundColor
              backgroundHoverColor
              borderColor
              borderHoverColor
              borderRadius
              iconColor
              iconHoverColor
            }
            container {
              backgroundColor
              borderRadius
              borderColor
            }
            cookieAndPrivacyPolicy {
              linkColor
              linkUnderline
            }
            poweredByTranscend {
              linkColor
            }
            description {
              textColor
              linkColor
              linkUnderline
            }
            footer {
              backgroundColor
              localePickerColor
            }
            header {
              logoImageUrl
              logoPosition
              textColor
            }
            horizontalAlign
            lockToEdges
            maxWidth
            modalSubtitle {
              textColor
            }
            modalTitle {
              textColor
            }
            purposeCard {
              backgroundColor
              borderRadius
              borderColor
            }
            purposeDescription {
              textColor
              linkColor
              linkUnderline
            }
            purposeListTitle {
              textColor
            }
            shrinkToFullWidth
            toggle {
              textColor
              iconColor
              enabledColor
              disabledColor
              knobColor
            }
          }
        }
      }
    }
  }
`;

export const CREATE_CONSENT_UI_VARIANT = gql`
  mutation TranscendCliCreateConsentUiVariant($input: CreateConsentUiVariantInput!) {
    createConsentUiVariant(input: $input) {
      consentUiVariant {
        id
      }
    }
  }
`;

export const UPDATE_CONSENT_UI_VARIANT = gql`
  mutation TranscendCliUpdateConsentUiVariant($input: UpdateConsentUiVariantInput!) {
    updateConsentUiVariant(input: $input) {
      consentUiVariant {
        id
      }
    }
  }
`;

export const CREATE_CONSENT_UI_THEME = gql`
  mutation TranscendCliCreateConsentUiTheme($input: CreateConsentUiThemeInput!) {
    createConsentUiTheme(input: $input) {
      consentUiTheme {
        id
        name
      }
    }
  }
`;

export const UPDATE_CONSENT_UI_THEME = gql`
  mutation TranscendCliUpdateConsentUiTheme($input: UpdateConsentUiThemeInput!) {
    updateConsentUiTheme(input: $input) {
      consentUiTheme {
        id
      }
    }
  }
`;
// ---- Deploy state and rollback ----

/** Deploy status of the consent manager, aligned with BundleDeployStatus in the GraphQL schema */
export const TranscendConsentManagerDeployState = {
  /** Deploy completed successfully */
  Deployed: 'DEPLOYED',
  /** Deploy in progress */
  DeployPending: 'DEPLOY_PENDING',
  /** Preview deploy */
  Preview: 'PREVIEW',
  /** Rollback in progress */
  RollbackPending: 'ROLLBACK_PENDING',
  /** Deploy failed */
  Error: 'ERROR',
  /** Test deploy failed */
  TestError: 'TEST_ERROR',
} as const;

/** Values of {@link TranscendConsentManagerDeployState} */
export type TranscendConsentManagerDeployState =
  (typeof TranscendConsentManagerDeployState)[keyof typeof TranscendConsentManagerDeployState];

/** Deploy state fields of the consent manager */
export interface TranscendConsentManagerDeployStateGql {
  /** Current deploy state */
  state: TranscendConsentManagerDeployState;
  /** Error message from the last failed deploy */
  deployError: string | null;
  /** When the last deploy finished */
  lastDeployedAt: string | null;
}

/** Full response from FETCH_CONSENT_MANAGER_DEPLOY_STATE */
export interface TranscendCliFetchConsentManagerDeployStateResponse {
  /** Consent manager wrapper */
  consentManager: {
    /** Consent manager object */
    consentManager: TranscendConsentManagerDeployStateGql;
  };
}

export const FETCH_CONSENT_MANAGER_DEPLOY_STATE = gql`
  query TranscendCliFetchConsentManagerDeployState {
    consentManager {
      consentManager {
        state
        deployError
        lastDeployedAt
      }
    }
  }
`;
