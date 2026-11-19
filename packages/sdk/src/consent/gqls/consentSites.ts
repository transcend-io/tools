import { gql } from 'graphql-request';

import {
  ATTRIBUTE_VALUE_FIELDS,
  OWNER_FIELDS,
  TEAM_FIELDS,
  type TranscendAttributeValueGql,
  type TranscendOwnerGql,
  type TranscendTeamGql,
} from '../../gqls/shared.js';

/** A host within a consent site */
export interface TranscendConsentHostGql {
  /** Consent host ID */
  id: string;
  /** The host (e.g. app.example.com) */
  host: string;
  /** The eTLD+1 of the host */
  site: string;
  /** Description */
  description?: string | null;
  /** Whether the host is included in the airgap metadata */
  includeInMetadata: boolean;
  /** Date the host was deleted, if it was */
  deletedAt?: string | null;
  /** Assigned owners */
  owners: TranscendOwnerGql[];
  /** Assigned teams */
  teams: TranscendTeamGql[];
  /** Custom attribute values */
  attributeValues: TranscendAttributeValueGql[];
}

/** A consent site (eTLD+1) and its hosts */
export interface TranscendConsentSiteGql {
  /** The eTLD+1 of the site */
  site: string;
  /** Hosts under this site */
  hosts: TranscendConsentHostGql[];
}

/** Full response from the CONSENT_SITES query */
export interface TranscendCliConsentSitesResponse {
  /** Consent sites result */
  consentSites: {
    /** List of consent site nodes */
    nodes: TranscendConsentSiteGql[];
    /** Total number of sites */
    totalSiteCount: number;
    /** Total number of hosts */
    totalHostCount: number;
  };
}

export const CONSENT_SITES = gql`
  query TranscendCliConsentSites(
    $input: AirgapBundleInput!
    $first: Int!
    $offset: Int!
  ) {
    consentSites(input: $input, first: $first, offset: $offset) {
      totalSiteCount
      totalHostCount
      nodes {
        site
        hosts {
          id
          host
          site
          description
          includeInMetadata
          deletedAt
          owners { ${OWNER_FIELDS} }
          teams { ${TEAM_FIELDS} }
          attributeValues { ${ATTRIBUTE_VALUE_FIELDS} }
        }
      }
    }
  }
`;

/** Full response from the CREATE_OR_UPDATE_CONSENT_SITES mutation */
export interface TranscendCliCreateOrUpdateConsentSitesResponse {
  /** Mutation result */
  createOrUpdateConsentSites: {
    /** Number of hosts created or updated */
    totalCount: number;
  };
}

export const CREATE_OR_UPDATE_CONSENT_SITES = gql`
  mutation TranscendCliCreateOrUpdateConsentSites(
    $airgapBundleId: ID!
    $sites: [BulkCreateOrUpdateConsentSiteInput!]!
  ) {
    createOrUpdateConsentSites(input: { airgapBundleId: $airgapBundleId, sites: $sites }) {
      totalCount
    }
  }
`;
