import { gql } from 'graphql-request';

/** Preference topic title translation */
export interface TranscendPreferenceTopicTitle {
  /** Translated description */
  description: string;
}

/** Preference topic linked to a purpose */
export interface TranscendPreferenceTopicGql {
  /** Topic ID */
  id: string;
  /** Topic slug */
  slug: string;
  /** Topic title with translations */
  title: TranscendPreferenceTopicTitle;
  /** Display color */
  color: string;
}

/** Data silo (integration) mapped to a purpose */
export interface TranscendMappedDataSiloGql {
  /** Data silo ID */
  id: string;
  /** Data silo display title */
  title: string;
  /** Data silo type */
  type: string;
}

/** Tracking purpose returned by the PURPOSES query */
export interface TranscendPurposeGql {
  /** Purpose ID */
  id: string;
  /** Purpose display name */
  name: string;
  /** Purpose description */
  description: string | null;
  /** Default consent state */
  defaultConsent: string;
  /** Purpose slug */
  trackingType: string;
  /** Whether the purpose is user-configurable */
  configurable: boolean;
  /** Whether the purpose is essential (non-optional) */
  essential: boolean;
  /** Whether the purpose appears in the consent manager UI */
  showInConsentManager: boolean;
  /** Whether the purpose is currently active */
  isActive: boolean;
  /** Display ordering weight */
  displayOrder: number;
  /** Signals that trigger automatic opt-out (e.g. GPC) */
  optOutSignals: string[];
  /** Soft-deletion timestamp, null if active */
  deletedAt: string | null;
  /** Authentication level required */
  authLevel: string;
  /** Whether the purpose appears in the privacy center */
  showInPrivacyCenter: boolean;
  /** Localized display title */
  title: string | null;
  /** Linked preference topics */
  preferenceTopics: TranscendPreferenceTopicGql[];
  /** Number of data points tracked under this purpose */
  purposeDataPointCount: number;
  /** Number of preference topic option value data points */
  preferenceTopicOptionValueDataPointCount: number;
  /** Data silos mapped to this purpose */
  mappedDataSilos: TranscendMappedDataSiloGql[];
}

/** Full response from the PURPOSES query */
export interface TranscendCliPurposesResponse {
  /** Purposes result */
  purposes: {
    /** List of purpose nodes */
    nodes: TranscendPurposeGql[];
    /** Total count of purposes */
    totalCount: number;
    /** Pagination info */
    pageInfo: {
      /** Whether more results exist */
      hasNextPage: boolean;
    };
  };
}

export const PURPOSES = gql`
  query TranscendCliPurposes($first: Int!) {
    purposes(first: $first) {
      pageInfo {
        hasNextPage
      }
      nodes {
        id
        name
        description
        defaultConsent
        trackingType
        configurable
        essential
        showInConsentManager
        isActive
        displayOrder
        optOutSignals
        deletedAt
        authLevel
        showInPrivacyCenter
        title
        preferenceTopics {
          id
          slug
          title {
            description
          }
          color
        }
        purposeDataPointCount
        preferenceTopicOptionValueDataPointCount
        mappedDataSilos {
          id
          title
          type
        }
      }
      totalCount
    }
  }
`;
