import type { ConsentTrackerSource, ConsentTrackerStatus } from '@transcend-io/privacy-types';
import { gql } from 'graphql-request';

import {
  ATTRIBUTE_VALUE_FIELDS,
  OWNER_FIELDS,
  TEAM_FIELDS,
  type TranscendAttributeValueGql,
  type TranscendOwnerGql,
  type TranscendTeamGql,
} from '../../gqls/shared.js';
import {
  SERVICE_FIELDS,
  TRACKING_PURPOSE_FIELDS,
  type TranscendCookieServiceGql,
  type TranscendTrackingPurposeGql,
} from './shared.js';

// ---- Shared cookie types ----

/** Cookie domain with occurrence count */
export interface TranscendCookieDomainGql {
  /** Domain ID */
  id: string;
  /** Domain name */
  domain: string;
  /** Number of occurrences on this domain */
  occurrences: number;
}

/** Cookie node returned by COOKIES query */
export interface TranscendCookieGql {
  /** Cookie ID */
  id: string;
  /** Cookie name */
  name: string;
  /** Whether this is a regex pattern */
  isRegex: boolean;
  /** Description */
  description?: string;
  /** Tracking purpose slugs (string array) */
  trackingPurposes: string[];
  /** Resolved tracking purposes */
  purposes: TranscendTrackingPurposeGql[];
  /** Frequency of occurrence (0-1) */
  frequency: number;
  /** Associated service */
  service?: TranscendCookieServiceGql;
  /** Whether marked as junk */
  isJunk: boolean;
  /** How the tracker was discovered */
  source: ConsentTrackerSource;
  /** Triage status */
  status: ConsentTrackerStatus;
  /** Assigned owners */
  owners: TranscendOwnerGql[];
  /** Assigned teams */
  teams: TranscendTeamGql[];
  /** Custom attribute values */
  attributeValues: TranscendAttributeValueGql[];
  /** Creation timestamp */
  createdAt: string;
  /** Last updated timestamp */
  updatedAt: string;
  /** Last seen by telemetry */
  lastDiscoveredAt?: string;
  /** Domains this cookie appears on */
  domains: TranscendCookieDomainGql[];
  /** Total telemetry occurrences */
  occurrences: number;
  /** Number of sites seen on (all time) */
  consentSiteCountAllTime: number;
  /** Number of sites seen on (last week) */
  consentSiteCountLastWeek: number;
}

/** Input for updating or creating a cookie */
export interface TranscendUpdateCookieInputGql {
  /** Cookie name (used as identifier for upsert) */
  name: string;
  /** Tracking purpose slugs */
  trackingPurposes?: string[];
  /** Purpose IDs to assign */
  purposeIds?: string[];
  /** Description */
  description?: string;
  /** Service integration name */
  service?: string;
  /** Mark as junk */
  isJunk?: boolean;
  /** Triage status */
  status?: ConsentTrackerStatus;
  /** Whether this is a regex pattern */
  isRegex?: boolean;
  /** How the tracker was discovered */
  source?: ConsentTrackerSource;
}

// ---- COOKIES query ----

/** Full response from the COOKIES query */
export interface TranscendCliCookiesResponse {
  /** Cookies result */
  cookies: {
    /** List of cookie nodes */
    nodes: TranscendCookieGql[];
    /** Total count of matching cookies */
    totalCount: number;
    /** Pagination info */
    pageInfo: {
      /** Whether more results exist */
      hasNextPage: boolean;
    };
  };
}

// TODO: https://transcend.height.app/T-27909 - enable optimizations
// isExportCsv: true
export const COOKIES = gql`
  query TranscendCliCookies(
    $input: AirgapBundleInput!
    $first: Int!
    $offset: Int!
    $filterBy: CookiesFiltersInput
    $orderBy: [CookieOrder!]
  ) {
    cookies(
      input: $input
      first: $first
      offset: $offset
      filterBy: $filterBy
      orderBy: $orderBy
      useMaster: false
    ) {
      totalCount
      pageInfo {
        hasNextPage
      }
      nodes {
        id
        name
        isRegex
        description
        trackingPurposes
        purposes { ${TRACKING_PURPOSE_FIELDS} }
        frequency
        service { ${SERVICE_FIELDS} }
        isJunk
        source
        status
        owners { ${OWNER_FIELDS} }
        teams { ${TEAM_FIELDS} }
        attributeValues { ${ATTRIBUTE_VALUE_FIELDS} }
        createdAt
        updatedAt
        lastDiscoveredAt
        domains {
          id
          domain
          occurrences
        }
        occurrences
        consentSiteCountAllTime
        consentSiteCountLastWeek
      }
    }
  }
`;

// ---- UPDATE_OR_CREATE_COOKIES mutation ----

/** Full response from the UPDATE_OR_CREATE_COOKIES mutation */
export interface TranscendCliUpdateOrCreateCookiesResponse {
  /** Mutation result */
  updateOrCreateCookies: {
    /** Client mutation ID */
    clientMutationId: string | null;
  };
}

export const UPDATE_OR_CREATE_COOKIES = gql`
  mutation TranscendCliUpdateOrCreateCookies(
    $cookies: [UpdateOrCreateCookieInput!]!
    $airgapBundleId: ID!
  ) {
    updateOrCreateCookies(input: { airgapBundleId: $airgapBundleId, cookies: $cookies }) {
      clientMutationId
    }
  }
`;

// ---- DELETE_COOKIES mutation ----

/** Full response from the DELETE_COOKIES mutation */
export interface TranscendCliDeleteCookiesResponse {
  /** Mutation result */
  deleteCookies: {
    /** Client mutation ID */
    clientMutationId: string | null;
  };
}

export const DELETE_COOKIES = gql`
  mutation TranscendCliDeleteCookies($input: DeleteCookiesInput!) {
    deleteCookies(input: $input) {
      clientMutationId
    }
  }
`;
