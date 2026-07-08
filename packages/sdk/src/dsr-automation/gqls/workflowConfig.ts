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

export const UPDATE_WORKFLOW_CONFIG: DocumentNode = parse(gql`
  mutation TranscendCliUpdateWorkflowConfig($input: UpdateWorkflowConfigInput!) {
    updateWorkflowConfig(input: $input) {
      success
    }
  }
`);
