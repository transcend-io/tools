import { parse, type DocumentNode } from 'graphql';
import { gql } from 'graphql-request';

export const NEW_IDENTIFIER_TYPES: DocumentNode = parse(gql`
  query TranscendCliNewIdentifierTypes {
    newIdentifierTypes {
      name
    }
  }
`);

export const CREATE_IDENTIFIER: DocumentNode = parse(gql`
  mutation TranscendCliCreateIdentifier($input: IdentifierInput!) {
    createIdentifier(input: $input) {
      identifier {
        id
        name
      }
    }
  }
`);

export const UPDATE_IDENTIFIER: DocumentNode = parse(gql`
  mutation TranscendCliUpdateIdentifier($input: UpdateIdentifierInput!) {
    updateIdentifier(input: $input) {
      clientMutationId
    }
  }
`);
