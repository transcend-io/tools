import { parse, type DocumentNode } from 'graphql';
import { gql } from 'graphql-request';

export const REMOVE_REQUEST_IDENTIFIERS: DocumentNode = parse(gql`
  mutation TranscendCliRemoveRequestIdentifiers($input: RemoveRequestIdentifiersInput!) {
    removeRequestIdentifiers(input: $input) {
      count
    }
  }
`);

export const REQUEST_IDENTIFIERS: DocumentNode = parse(gql`
  query TranscendCliRequestIdentifiers(
    $first: Int!
    $after: String
    $requestIds: [ID!]
    $updatedAtBefore: Date
    $updatedAtAfter: Date
  ) {
    requestIdentifiers(
      input: { requestIds: $requestIds }
      filterBy: { updatedAtBefore: $updatedAtBefore, updatedAtAfter: $updatedAtAfter }
      first: $first
      after: $after
      useMaster: false
      orderBy: [{ field: createdAt, direction: ASC }, { field: name, direction: ASC }]
    ) {
      nodes {
        id
        name
        isVerifiedAtLeastOnce
      }
      totalCount
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`);
