import type {
  ConsentTrackerSource,
  ConsentTrackerStatus,
  DataFlowScope,
} from '@transcend-io/privacy-types';
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

// ---- Shared data flow types ----

/** Data flow node returned by DATA_FLOWS query and UPDATE_DATA_FLOWS mutation */
export interface TranscendDataFlowGql {
  /** Data flow ID */
  id: string;
  /** URL/host value */
  value: string;
  /** Scope type (HOST, PATH, REGEX, etc.) */
  type: DataFlowScope;
  /** Description */
  description?: string;
  /** Tracking purpose slugs */
  trackingType: string[];
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
  /** Total telemetry occurrences */
  occurrences: number;
  /** Number of sites seen on (all time) */
  consentSiteCountAllTime: number;
  /** Number of sites seen on (last week) */
  consentSiteCountLastWeek: number;
}

/** Input for updating a data flow */
export interface TranscendUpdateDataFlowInputGql {
  /** Data flow ID */
  id: string;
  /** URL/host value */
  value?: string;
  /** Scope type */
  type?: DataFlowScope;
  /** Tracking purpose slugs */
  trackingType?: string[];
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
}

// ---- Shared field selection for mutation responses ----

const DATA_FLOW_RESPONSE_FIELDS = `
  id
  value
  type
  description
  trackingType
  purposes { ${TRACKING_PURPOSE_FIELDS} }
  frequency
  service { ${SERVICE_FIELDS} }
  isJunk
  source
  status
  createdAt
  updatedAt
  lastDiscoveredAt
  occurrences
  consentSiteCountAllTime
  consentSiteCountLastWeek
`;

// ---- CREATE_DATA_FLOWS mutation ----

/** Full response from the CREATE_DATA_FLOWS mutation */
export interface TranscendCliCreateDataFlowsResponse {
  /** Mutation result */
  createDataFlows: {
    /** Created data flows (IDs only) */
    dataFlows: {
      /** Data flow ID */
      id: string;
    }[];
  };
}

export const CREATE_DATA_FLOWS = gql`
  mutation TranscendCliCreateDataFlows(
    $dataFlows: [DataFlowInput!]!
    $airgapBundleId: ID!
    $classifyService: Boolean
  ) {
    createDataFlows(
      input: {
        airgapBundleId: $airgapBundleId
        dataFlows: $dataFlows
        classifyService: $classifyService
      }
    ) {
      dataFlows {
        id
      }
    }
  }
`;

// ---- UPDATE_DATA_FLOWS mutation ----

/** Full response from the UPDATE_DATA_FLOWS mutation */
export interface TranscendCliUpdateDataFlowsResponse {
  /** Mutation result */
  updateDataFlows: {
    /** Updated data flows with full fields */
    dataFlows: TranscendDataFlowGql[];
  };
}

export const UPDATE_DATA_FLOWS = gql`
  mutation TranscendCliUpdateDataFlows(
    $airgapBundleId: ID!
    $dataFlows: [UpdateDataFlowInput!]!
    $classifyService: Boolean
  ) {
    updateDataFlows(
      input: {
        airgapBundleId: $airgapBundleId
        dataFlows: $dataFlows
        classifyService: $classifyService
      }
    ) {
      dataFlows { ${DATA_FLOW_RESPONSE_FIELDS} }
    }
  }
`;

// ---- DATA_FLOWS query ----

/** Full response from the DATA_FLOWS query */
export interface TranscendCliDataFlowsResponse {
  /** Data flows result */
  dataFlows: {
    /** List of data flow nodes */
    nodes: TranscendDataFlowGql[];
    /** Total count of matching data flows */
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
export const DATA_FLOWS = gql`
  query TranscendCliDataFlows(
    $input: AirgapBundleInput!
    $first: Int!
    $offset: Int!
    $filterBy: DataFlowsFiltersInput
    $orderBy: [DataFlowOrder!]
  ) {
    dataFlows(
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
        value
        type
        description
        trackingType
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
        occurrences
        consentSiteCountAllTime
        consentSiteCountLastWeek
      }
    }
  }
`;

// ---- DELETE_DATA_FLOWS mutation ----

/** Full response from the DELETE_DATA_FLOWS mutation */
export interface TranscendCliDeleteDataFlowsResponse {
  /** Mutation result */
  deleteDataFlows: {
    /** Client mutation ID */
    clientMutationId: string | null;
  };
}

export const DELETE_DATA_FLOWS = gql`
  mutation TranscendCliDeleteDataFlows($input: DeleteDataFlowsInput!) {
    deleteDataFlows(input: $input) {
      clientMutationId
    }
  }
`;
