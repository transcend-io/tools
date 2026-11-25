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
/** Core airgap bundle module fields requested in rollback queries */
export const TranscendAirgapBundleRollbackBundleField = {
  /** GraphQL field `cdn` */
  Cdn: 'cdn',
  /** GraphQL field `core` */
  Core: 'core',
  /** GraphQL field `xdi` */
  Xdi: 'xdi',
  /** GraphQL field `userscript` */
  Userscript: 'userscript',
  /** GraphQL field `explorer` */
  Explorer: 'explorer',
  /** GraphQL field `metadata` */
  Metadata: 'metadata',
  /** GraphQL field `ui` */
  Ui: 'ui',
  /** GraphQL field `uiV2` */
  UiV2: 'uiV2',
  /** GraphQL field `uiV2Css` */
  UiV2Css: 'uiV2Css',
  /** GraphQL field `stylesheet` */
  Stylesheet: 'stylesheet',
} as const;

/** Locale message module fields */
export const TranscendAirgapBundleRollbackMessageLocaleField = {
  /** GraphQL field `En` */
  En: 'En',
  /** GraphQL field `He` */
  He: 'He',
  /** GraphQL field `Bs` */
  Bs: 'Bs',
  /** GraphQL field `Dv` */
  Dv: 'Dv',
  /** GraphQL field `Fa` */
  Fa: 'Fa',
  /** GraphQL field `ArAe` */
  ArAe: 'ArAe',
  /** GraphQL field `FrFr` */
  FrFr: 'FrFr',
  /** GraphQL field `DeDe` */
  DeDe: 'DeDe',
  /** GraphQL field `ItIt` */
  ItIt: 'ItIt',
  /** GraphQL field `AfZz` */
  AfZz: 'AfZz',
  /** GraphQL field `BgBg` */
  BgBg: 'BgBg',
  /** GraphQL field `ZhCn` */
  ZhCn: 'ZhCn',
  /** GraphQL field `ZhHans` */
  ZhHans: 'ZhHans',
  /** GraphQL field `HrHr` */
  HrHr: 'HrHr',
  /** GraphQL field `CsCz` */
  CsCz: 'CsCz',
  /** GraphQL field `DaDk` */
  DaDk: 'DaDk',
  /** GraphQL field `FiFi` */
  FiFi: 'FiFi',
  /** GraphQL field `ElGr` */
  ElGr: 'ElGr',
  /** GraphQL field `HiIn` */
  HiIn: 'HiIn',
  /** GraphQL field `HuHu` */
  HuHu: 'HuHu',
  /** GraphQL field `IdId` */
  IdId: 'IdId',
  /** GraphQL field `JaJp` */
  JaJp: 'JaJp',
  /** GraphQL field `KoKr` */
  KoKr: 'KoKr',
  /** GraphQL field `LtLt` */
  LtLt: 'LtLt',
  /** GraphQL field `MsMy` */
  MsMy: 'MsMy',
  /** GraphQL field `MrIn` */
  MrIn: 'MrIn',
  /** GraphQL field `NbNi` */
  NbNi: 'NbNi',
  /** GraphQL field `PlPl` */
  PlPl: 'PlPl',
  /** GraphQL field `PtBr` */
  PtBr: 'PtBr',
  /** GraphQL field `RoRo` */
  RoRo: 'RoRo',
  /** GraphQL field `RuRu` */
  RuRu: 'RuRu',
  /** GraphQL field `SrLatnRs` */
  SrLatnRs: 'SrLatnRs',
  /** GraphQL field `SvSe` */
  SvSe: 'SvSe',
  /** GraphQL field `TaIn` */
  TaIn: 'TaIn',
  /** GraphQL field `ThTh` */
  ThTh: 'ThTh',
  /** GraphQL field `TrTr` */
  TrTr: 'TrTr',
  /** GraphQL field `UkUa` */
  UkUa: 'UkUa',
  /** GraphQL field `ViVn` */
  ViVn: 'ViVn',
  /** GraphQL field `NlNl` */
  NlNl: 'NlNl',
  /** GraphQL field `EsEs` */
  EsEs: 'EsEs',
  /** GraphQL field `Es419` */
  Es419: 'Es419',
  /** GraphQL field `ZhHk` */
  ZhHk: 'ZhHk',
  /** GraphQL field `HeIl` */
  HeIl: 'HeIl',
  /** GraphQL field `IsIs` */
  IsIs: 'IsIs',
} as const;

/** TCF infrastructure module fields */
export const TranscendAirgapBundleRollbackTcfInfraField = {
  /** GraphQL field `tcfUi` */
  TcfUi: 'tcfUi',
  /** GraphQL field `gpp` */
  Gpp: 'gpp',
  /** GraphQL field `tcfStylesheet` */
  TcfStylesheet: 'tcfStylesheet',
  /** GraphQL field `tcfVendorsList` */
  TcfVendorsList: 'tcfVendorsList',
} as const;

/** TCF Global Vendor List locale fields */
export const TranscendAirgapBundleRollbackTcfGvlField = {
  /** GraphQL field `tcfGvlAr` */
  TcfGvlAr: 'tcfGvlAr',
  /** GraphQL field `tcfGvlBg` */
  TcfGvlBg: 'tcfGvlBg',
  /** GraphQL field `tcfGvlBs` */
  TcfGvlBs: 'tcfGvlBs',
  /** GraphQL field `tcfGvlCs` */
  TcfGvlCs: 'tcfGvlCs',
  /** GraphQL field `tcfGvlDa` */
  TcfGvlDa: 'tcfGvlDa',
  /** GraphQL field `tcfGvlDe` */
  TcfGvlDe: 'tcfGvlDe',
  /** GraphQL field `tcfGvlEl` */
  TcfGvlEl: 'tcfGvlEl',
  /** GraphQL field `tcfGvlEn` */
  TcfGvlEn: 'tcfGvlEn',
  /** GraphQL field `tcfGvlEs` */
  TcfGvlEs: 'tcfGvlEs',
  /** GraphQL field `tcfGvlFi` */
  TcfGvlFi: 'tcfGvlFi',
  /** GraphQL field `tcfGvlFr` */
  TcfGvlFr: 'tcfGvlFr',
  /** GraphQL field `tcfGvlHe` */
  TcfGvlHe: 'tcfGvlHe',
  /** GraphQL field `tcfGvlHi` */
  TcfGvlHi: 'tcfGvlHi',
  /** GraphQL field `tcfGvlHr` */
  TcfGvlHr: 'tcfGvlHr',
  /** GraphQL field `tcfGvlHu` */
  TcfGvlHu: 'tcfGvlHu',
  /** GraphQL field `tcfGvlId` */
  TcfGvlId: 'tcfGvlId',
  /** GraphQL field `tcfGvlIs` */
  TcfGvlIs: 'tcfGvlIs',
  /** GraphQL field `tcfGvlIt` */
  TcfGvlIt: 'tcfGvlIt',
  /** GraphQL field `tcfGvlJa` */
  TcfGvlJa: 'tcfGvlJa',
  /** GraphQL field `tcfGvlKo` */
  TcfGvlKo: 'tcfGvlKo',
  /** GraphQL field `tcfGvlLt` */
  TcfGvlLt: 'tcfGvlLt',
  /** GraphQL field `tcfGvlMs` */
  TcfGvlMs: 'tcfGvlMs',
  /** GraphQL field `tcfGvlNl` */
  TcfGvlNl: 'tcfGvlNl',
  /** GraphQL field `tcfGvlNo` */
  TcfGvlNo: 'tcfGvlNo',
  /** GraphQL field `tcfGvlPl` */
  TcfGvlPl: 'tcfGvlPl',
  /** GraphQL field `tcfGvlPtBr` */
  TcfGvlPtBr: 'tcfGvlPtBr',
  /** GraphQL field `tcfGvlRo` */
  TcfGvlRo: 'tcfGvlRo',
  /** GraphQL field `tcfGvlRu` */
  TcfGvlRu: 'tcfGvlRu',
  /** GraphQL field `tcfGvlSrLatn` */
  TcfGvlSrLatn: 'tcfGvlSrLatn',
  /** GraphQL field `tcfGvlSv` */
  TcfGvlSv: 'tcfGvlSv',
  /** GraphQL field `tcfGvlTh` */
  TcfGvlTh: 'tcfGvlTh',
  /** GraphQL field `tcfGvlTr` */
  TcfGvlTr: 'tcfGvlTr',
  /** GraphQL field `tcfGvlUk` */
  TcfGvlUk: 'tcfGvlUk',
  /** GraphQL field `tcfGvlVi` */
  TcfGvlVi: 'tcfGvlVi',
  /** GraphQL field `tcfGvlZh` */
  TcfGvlZh: 'tcfGvlZh',
} as const;

/** TCF locale message module fields */
export const TranscendAirgapBundleRollbackTcfMessageField = {
  /** GraphQL field `tcfEn` */
  TcfEn: 'tcfEn',
  /** GraphQL field `tcfHe` */
  TcfHe: 'tcfHe',
  /** GraphQL field `tcfBs` */
  TcfBs: 'tcfBs',
  /** GraphQL field `tcfDv` */
  TcfDv: 'tcfDv',
  /** GraphQL field `tcfFa` */
  TcfFa: 'tcfFa',
  /** GraphQL field `tcfArAe` */
  TcfArAe: 'tcfArAe',
  /** GraphQL field `tcfFrFr` */
  TcfFrFr: 'tcfFrFr',
  /** GraphQL field `tcfDeDe` */
  TcfDeDe: 'tcfDeDe',
  /** GraphQL field `tcfItIt` */
  TcfItIt: 'tcfItIt',
  /** GraphQL field `tcfAfZz` */
  TcfAfZz: 'tcfAfZz',
  /** GraphQL field `tcfBgBg` */
  TcfBgBg: 'tcfBgBg',
  /** GraphQL field `tcfZhCn` */
  TcfZhCn: 'tcfZhCn',
  /** GraphQL field `tcfZhHans` */
  TcfZhHans: 'tcfZhHans',
  /** GraphQL field `tcfHrHr` */
  TcfHrHr: 'tcfHrHr',
  /** GraphQL field `tcfCsCz` */
  TcfCsCz: 'tcfCsCz',
  /** GraphQL field `tcfDaDk` */
  TcfDaDk: 'tcfDaDk',
  /** GraphQL field `tcfFiFi` */
  TcfFiFi: 'tcfFiFi',
  /** GraphQL field `tcfElGr` */
  TcfElGr: 'tcfElGr',
  /** GraphQL field `tcfHiIn` */
  TcfHiIn: 'tcfHiIn',
  /** GraphQL field `tcfHuHu` */
  TcfHuHu: 'tcfHuHu',
  /** GraphQL field `tcfIdId` */
  TcfIdId: 'tcfIdId',
  /** GraphQL field `tcfJaJp` */
  TcfJaJp: 'tcfJaJp',
  /** GraphQL field `tcfKoKr` */
  TcfKoKr: 'tcfKoKr',
  /** GraphQL field `tcfLtLt` */
  TcfLtLt: 'tcfLtLt',
  /** GraphQL field `tcfMsMy` */
  TcfMsMy: 'tcfMsMy',
  /** GraphQL field `tcfMrIn` */
  TcfMrIn: 'tcfMrIn',
  /** GraphQL field `tcfNbNi` */
  TcfNbNi: 'tcfNbNi',
  /** GraphQL field `tcfPlPl` */
  TcfPlPl: 'tcfPlPl',
  /** GraphQL field `tcfPtBr` */
  TcfPtBr: 'tcfPtBr',
  /** GraphQL field `tcfRoRo` */
  TcfRoRo: 'tcfRoRo',
  /** GraphQL field `tcfRuRu` */
  TcfRuRu: 'tcfRuRu',
  /** GraphQL field `tcfSrLatnRs` */
  TcfSrLatnRs: 'tcfSrLatnRs',
  /** GraphQL field `tcfSvSe` */
  TcfSvSe: 'tcfSvSe',
  /** GraphQL field `tcfTaIn` */
  TcfTaIn: 'tcfTaIn',
  /** GraphQL field `tcfThTh` */
  TcfThTh: 'tcfThTh',
  /** GraphQL field `tcfTrTr` */
  TcfTrTr: 'tcfTrTr',
  /** GraphQL field `tcfUkUa` */
  TcfUkUa: 'tcfUkUa',
  /** GraphQL field `tcfViVn` */
  TcfViVn: 'tcfViVn',
  /** GraphQL field `tcfNlNl` */
  TcfNlNl: 'tcfNlNl',
  /** GraphQL field `tcfEsEs` */
  TcfEsEs: 'tcfEsEs',
  /** GraphQL field `tcfEs419` */
  TcfEs419: 'tcfEs419',
  /** GraphQL field `tcfZhHk` */
  TcfZhHk: 'tcfZhHk',
  /** GraphQL field `tcfHeIl` */
  TcfHeIl: 'tcfHeIl',
  /** GraphQL field `tcfIsIs` */
  TcfIsIs: 'tcfIsIs',
} as const;

/** Mobile and sync module fields */
export const TranscendAirgapBundleRollbackMobileField = {
  /** GraphQL field `nativeAppConfig` */
  NativeAppConfig: 'nativeAppConfig',
  /** GraphQL field `bridgeJs` */
  BridgeJs: 'bridgeJs',
  /** GraphQL field `bridgeHtml` */
  BridgeHtml: 'bridgeHtml',
  /** GraphQL field `mobileLoadOptions` */
  MobileLoadOptions: 'mobileLoadOptions',
  /** GraphQL field `mobileUiLoadOptions` */
  MobileUiLoadOptions: 'mobileUiLoadOptions',
  /** GraphQL field `sync` */
  Sync: 'sync',
  /** GraphQL field `isTest` */
  IsTest: 'isTest',
} as const;

/** All GraphQL field names on airgap bundle version nodes used for rollback */
export const AIRGAP_BUNDLE_ROLLBACK_FIELDS = [
  ...Object.values(TranscendAirgapBundleRollbackBundleField),
  ...Object.values(TranscendAirgapBundleRollbackMessageLocaleField),
  ...Object.values(TranscendAirgapBundleRollbackTcfInfraField),
  ...Object.values(TranscendAirgapBundleRollbackTcfGvlField),
  ...Object.values(TranscendAirgapBundleRollbackTcfMessageField),
  ...Object.values(TranscendAirgapBundleRollbackMobileField),
] as const;

/** Values of {@link AIRGAP_BUNDLE_ROLLBACK_FIELDS} */
export type TranscendAirgapBundleRollbackFieldValue =
  (typeof AIRGAP_BUNDLE_ROLLBACK_FIELDS)[number];

/** One deployed bundle version that can be rolled back to */
export interface TranscendCliAirgapBundleRollbackVersionNode {
  /** airgap.js version string */
  version: string | null;
  /** When this version was deployed */
  createdAt: string;
  /** Module versions, keyed by the names in {@link AIRGAP_BUNDLE_ROLLBACK_FIELDS} */
  [field: string]: string | boolean | null | undefined;
}

/** Response from AIRGAP_BUNDLE_ROLLBACK_VERSIONS */
export interface TranscendCliAirgapBundleRollbackVersionsResponse {
  /** Version list */
  airgapBundleVersions: {
    /** Most recent versions first */
    nodes: TranscendCliAirgapBundleRollbackVersionNode[];
  };
}

export const AIRGAP_BUNDLE_ROLLBACK_VERSIONS = gql`
  query TranscendCliAirgapBundleRollbackVersions(
    $id: ID!
    $first: Int!
    $input: AirgapBundleVersionsInput!
  ) {
    airgapBundleVersions(id: $id, first: $first, input: $input) {
      nodes {
        version
        createdAt
        ${AIRGAP_BUNDLE_ROLLBACK_FIELDS.join('\n        ')}
      }
    }
  }
`;

export const ROLLBACK_AIRGAP_BUNDLE = gql`
  mutation TranscendCliRollbackAirgapBundle($id: ID!, $input: RollbackAirgapBundleInput!) {
    rollbackAirgapBundle(id: $id, input: $input) {
      success
    }
  }
`;
