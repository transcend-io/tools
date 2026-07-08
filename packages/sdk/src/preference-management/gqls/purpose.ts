import { parse, type DocumentNode } from 'graphql';
import { gql } from 'graphql-request';

export const PURPOSES: DocumentNode = parse(gql`
  query TranscendCliPurposes(
    $first: Int!
    $offset: Int!
    $filterBy: TrackingPurposeFiltersInput
    $input: TrackingPurposeInput!
  ) {
    purposes(first: $first, offset: $offset, filterBy: $filterBy, input: $input) {
      nodes {
        id
        name
        description
        defaultConsent
        trackingType
        configurable
        essential
        showInConsentManager
        isActive
        displayOrder
        optOutSignals
        deletedAt
        authLevel
        showInPrivacyCenter
        title
      }
    }
  }
`);

export const CREATE_PURPOSE: DocumentNode = parse(gql`
  mutation TranscendCliCreatePurpose($input: CreatePurposeInput!) {
    createPurpose(input: $input) {
      purpose {
        id
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
        trackingType
      }
    }
  }
`);
