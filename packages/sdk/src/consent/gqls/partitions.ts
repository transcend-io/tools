import { gql } from 'graphql-request';

// ---- Shared partition types ----

/** Consent partition node */
export interface TranscendConsentPartitionGql {
  /** Partition ID */
  id: string;
  /** Partition name */
  name: string;
  /** Partition key */
  partition: string;
}

// ---- CONSENT_PARTITIONS query ----

/** Full response from the CONSENT_PARTITIONS query */
export interface TranscendCliConsentPartitionsResponse {
  /** Partitions result */
  consentPartitions: {
    /** List of partition nodes */
    nodes: TranscendConsentPartitionGql[];
  };
}

// TODO: https://transcend.height.app/T-27909 - order by createdAt
// TODO: https://transcend.height.app/T-27909 - enable optimizations
// useMaster: false
// isExportCsv: true
export const CONSENT_PARTITIONS = gql`
  query TranscendCliConsentPartitions($first: Int!, $offset: Int!) {
    consentPartitions(first: $first, offset: $offset) {
      nodes {
        id
        name
        partition
      }
    }
  }
`;

// ---- CREATE_CONSENT_PARTITION mutation ----

/** Full response from the CREATE_CONSENT_PARTITION mutation */
export interface TranscendCliCreateConsentPartitionResponse {
  /** Mutation result */
  createConsentPartition: {
    /** Client mutation ID */
    clientMutationId: string | null;
  };
}

export const CREATE_CONSENT_PARTITION = gql`
  mutation TranscendCliCreateConsentPartition($input: CreateConsentPartitionInput!) {
    createConsentPartition(input: $input) {
      clientMutationId
    }
  }
`;
