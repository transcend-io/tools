import { parse, type DocumentNode } from 'graphql';
import { gql } from 'graphql-request';

export const WORKFLOWS: DocumentNode = parse(gql`
  query TranscendCliWorkflows($first: Int!, $offset: Int!, $filterBy: WorkflowFilterInput) {
    workflows(first: $first, offset: $offset, filterBy: $filterBy) {
      nodes {
        id
        internalName
        title {
          defaultMessage
        }
        action {
          id
          type
        }
        subject {
          id
          type
        }
        workflowConfigType
      }
      totalCount
    }
  }
`);
