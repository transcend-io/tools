import { parse, type DocumentNode } from 'graphql';
import { gql } from 'graphql-request';

export const CREATE_PURPOSE: DocumentNode = parse(gql`
  mutation TranscendCliCreatePurpose($input: TrackingPurposeCreateInput!) {
    createPurpose(input: $input) {
      trackingPurpose {
        id
        name
        trackingType
      }
    }
  }
`);

export const UPDATE_PURPOSE: DocumentNode = parse(gql`
  mutation TranscendCliUpdatePurpose($input: TrackingPurposeUpdateInput!) {
    updatePurpose(input: $input) {
      trackingPurpose {
        id
        name
        trackingType
      }
    }
  }
`);
