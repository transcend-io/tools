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
