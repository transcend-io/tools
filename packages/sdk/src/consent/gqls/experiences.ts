import { gql } from 'graphql-request';

// ---- Shared experience types ----

/** Region associated with a consent experience */
export interface TranscendExperienceRegionGql {
  /** ISO country subdivision code */
  countrySubDivision?: string;
  /** ISO country code */
  country?: string;
}

/** Experience purpose reference */
export interface TranscendExperiencePurposeGql {
  /** Purpose display name */
  name: string;
  /** Purpose slug */
  trackingType: string;
}

/** Consent experience (regional regime) returned by EXPERIENCES query */
export interface TranscendExperienceGql {
  /** Experience ID */
  id: string;
  /** Internal name */
  name: string;
  /** Display name shown to users */
  displayName?: string;
  /** Regions where this experience applies */
  regions: TranscendExperienceRegionGql[];
  /** Whether regions list is inclusive or exclusive */
  operator: string;
  /** Display priority for ordering */
  displayPriority: number;
  /** Behavior on consent expiry */
  onConsentExpiry: string;
  /** Consent expiry duration */
  consentExpiry: number;
  /** Initial view state for auto-prompting */
  viewState: string;
  /** Purposes that can be opted out of */
  purposes: TranscendExperiencePurposeGql[];
  /** Purposes opted out by default */
  optedOutPurposes: TranscendExperiencePurposeGql[];
  /** Browser languages for this experience */
  browserLanguages: string[];
  /** Browser time zones for this experience */
  browserTimeZones: string[];
}

// ---- EXPERIENCES query ----

/** Full response from the EXPERIENCES query */
export interface TranscendCliExperiencesResponse {
  /** Experiences result */
  experiences: {
    /** Total count of experiences */
    totalCount: number;
    /** List of experience nodes */
    nodes: TranscendExperienceGql[];
  };
}

// TODO: https://transcend.height.app/T-27909 - order by createdAt
// TODO: https://transcend.height.app/T-27909 - enable optimizations
// isExportCsv: true
export const EXPERIENCES = gql`
  query TranscendCliExperiences($first: Int!, $offset: Int!) {
    experiences(first: $first, offset: $offset, useMaster: false) {
      totalCount
      nodes {
        id
        name
        displayName
        regions {
          countrySubDivision
          country
        }
        operator
        displayPriority
        onConsentExpiry
        consentExpiry
        viewState
        purposes {
          name
          trackingType
        }
        optedOutPurposes {
          name
          trackingType
        }
        browserLanguages
        browserTimeZones
      }
    }
  }
`;

// ---- UPDATE_CONSENT_EXPERIENCE mutation ----

/** Full response from the UPDATE_CONSENT_EXPERIENCE mutation */
export interface TranscendCliUpdateConsentExperienceResponse {
  /** Mutation result */
  updateExperience: {
    /** Client mutation ID */
    clientMutationId: string | null;
  };
}

export const UPDATE_CONSENT_EXPERIENCE = gql`
  mutation TranscendCliUpdateConsentExperience($input: UpdateExperienceInput!) {
    updateExperience(input: $input) {
      clientMutationId
    }
  }
`;

// ---- CREATE_CONSENT_EXPERIENCE mutation ----

/** Full response from the CREATE_CONSENT_EXPERIENCE mutation */
export interface TranscendCliCreateConsentExperienceResponse {
  /** Mutation result */
  createExperience: {
    /** Client mutation ID */
    clientMutationId: string | null;
  };
}

export const CREATE_CONSENT_EXPERIENCE = gql`
  mutation TranscendCliCreateConsentExperience($input: CreateExperienceInput!) {
    createExperience(input: $input) {
      clientMutationId
    }
  }
`;
