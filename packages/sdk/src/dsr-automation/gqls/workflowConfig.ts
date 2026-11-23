import { parse, type DocumentNode } from 'graphql';
import { gql } from 'graphql-request';

export const WORKFLOW_CONFIGS: DocumentNode = parse(gql`
  query TranscendCliWorkflowConfigs($first: Int!, $offset: Int!, $filterBy: WorkflowFilterInput) {
    workflows(first: $first, offset: $offset, filterBy: $filterBy) {
      nodes {
        id
        title {
          defaultMessage
        }
        subtitle {
          defaultMessage
        }
        description {
          defaultMessage
        }
        internalName
        workflowConfigVisibility
        workflowConfigType
        collectDataSubjectRegions
        regionList
        expiryTime {
          region
          value
        }
        action {
          id
          type
        }
        subject {
          id
          type
        }
        WorkflowConfigAttributeKeys {
          attributeKey {
            id
            name
          }
        }
      }
      totalCount
    }
  }
`);

export const CREATE_WORKFLOW: DocumentNode = parse(gql`
  mutation TranscendCliCreateWorkflow($input: CreateWorkflowInput!) {
    createWorkflow(input: $input) {
      workflowConfig {
        id
        internalName
      }
    }
  }
`);

export const UPDATE_WORKFLOW_CONFIG: DocumentNode = parse(gql`
  mutation TranscendCliUpdateWorkflowConfig($input: UpdateWorkflowConfigInput!) {
    updateWorkflowConfig(input: $input) {
      success
    }
  }
`);

export const WORKFLOW_ENRICHERS: DocumentNode = parse(gql`
  query TranscendCliWorkflowEnrichers(
    $input: WorkflowEnrichersInput!
    $first: Int!
    $offset: Int!
  ) {
    workflowEnrichers(first: $first, offset: $offset, input: $input) {
      nodes {
        id
        title
      }
      totalCount
    }
  }
`);

export const WORKFLOW_IDENTIFIERS: DocumentNode = parse(gql`
  query TranscendCliWorkflowIdentifiers(
    $input: WorkflowConfigIdInput!
    $first: Int!
    $offset: Int!
  ) {
    workflowIdentifiers(first: $first, offset: $offset, input: $input) {
      nodes {
        id
        name
        isDisabled
      }
      totalCount
    }
  }
`);

export const ADD_DATA_SILO_TO_WORKFLOW_CONFIG: DocumentNode = parse(gql`
  mutation TranscendCliAddDataSiloToWorkflowConfig($input: WorkflowDataSiloInput!) {
    addDataSiloToWorkflowConfig(input: $input) {
      success
    }
  }
`);

export const REMOVE_DATA_SILO_FROM_WORKFLOW_CONFIG: DocumentNode = parse(gql`
  mutation TranscendCliRemoveDataSiloFromWorkflowConfig($input: WorkflowDataSiloInput!) {
    removeDataSiloFromWorkflowConfig(input: $input) {
      success
    }
  }
`);

export const ADD_ENRICHERS_TO_WORKFLOW_CONFIG: DocumentNode = parse(gql`
  mutation TranscendCliAddEnrichersToWorkflowConfig($input: AddEnrichersToWorkflowConfigInput!) {
    addEnrichersToWorkflowConfig(input: $input) {
      success
    }
  }
`);

export const REMOVE_ENRICHERS_FROM_WORKFLOW_CONFIG: DocumentNode = parse(gql`
  mutation TranscendCliRemoveEnrichersFromWorkflowConfig(
    $input: RemoveEnrichersFromWorkflowConfigInput!
  ) {
    removeEnrichersFromWorkflowConfig(input: $input) {
      success
    }
  }
`);
