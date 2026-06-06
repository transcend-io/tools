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
        bundleURL
        testBundleURL
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

export const UPDATE_CONSENT_MANAGER_THEME = gql`
  mutation TranscendCliUpdateConsentManagerTheme($input: UpdateConsentManagerThemeInput!) {
    updateConsentManagerTheme(input: $input) {
      clientMutationId
    }
  }
`;
