import { gql } from 'graphql-request';

/** Tracking purpose returned by the PURPOSES query */
export interface TranscendPurposeGql {
  /** Purpose ID */
  id: string;
  /** Purpose display name */
  name: string;
  /** Purpose slug */
  trackingType: string;
}

/** Full response from the PURPOSES query */
export interface TranscendCliPurposesResponse {
  /** Purposes result */
  purposes: {
    /** List of purpose nodes */
    nodes: TranscendPurposeGql[];
    /** Total count of purposes */
    totalCount: number;
  };
}

export const PURPOSES = gql`
  query TranscendCliPurposes($first: Int!) {
    purposes(first: $first) {
      nodes {
        id
        name
        trackingType
      }
      totalCount
    }
  }
`;
