import { parse, type DocumentNode } from 'graphql';
import { gql } from 'graphql-request';

export const CREATE_PURPOSE: DocumentNode = parse(gql`
  mutation TranscendCliCreatePurpose($input: CreatePurposeInput!) {
    createPurpose(input: $input) {
      purpose {
        id
        name
        trackingType
      }
    }
  }
`);

export const UPDATE_PURPOSE: DocumentNode = parse(gql`
  mutation TranscendCliUpdatePurpose($input: UpdatePurposeInput!) {
    updatePurpose(input: $input) {
      purpose {
        id
        name
        trackingType
      }
    }
  }
`);
