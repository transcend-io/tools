import { parse, type DocumentNode } from 'graphql';
import { gql } from 'graphql-request';

export const PREFERENCE_TOPICS: DocumentNode = parse(gql`
  query TranscendCliPreferenceTopics(
    $first: Int!
    $offset: Int!
    $filterBy: PreferenceTopicFilterInput
  ) {
    preferenceTopics(first: $first, offset: $offset, filterBy: $filterBy) {
      nodes {
        id
        slug
        type
        title {
          id
          defaultMessage
        }
        showInPrivacyCenter
        displayDescription {
          id
          defaultMessage
        }
        defaultConfiguration
        preferenceOptionValues {
          slug
          title {
            id
            defaultMessage
          }
        }
        purpose {
          trackingType
        }
      }
    }
  }
`);
