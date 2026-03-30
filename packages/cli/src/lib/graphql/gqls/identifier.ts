import { gql } from 'graphql-request';

export const NEW_IDENTIFIER_TYPES = gql`
  query TranscendCliNewIdentifierTypes {
    newIdentifierTypes {
      name
    }
  }
`;

export const CREATE_IDENTIFIER = gql`
  mutation TranscendCliCreateIdentifier($input: IdentifierInput!) {
    createIdentifier(input: $input) {
      identifier {
        id
        name
      }
    }
  }
`;

export const UPDATE_IDENTIFIER = gql`
  mutation TranscendCliUpdateIdentifier($input: UpdateIdentifierInput!) {
    updateIdentifier(input: $input) {
      clientMutationId
    }
  }
`;
