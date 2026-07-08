import { parse, type DocumentNode } from 'graphql';
import { gql } from 'graphql-request';

export const PREFERENCE_OPTION_VALUES: DocumentNode = parse(gql`
  query TranscendCliPreferenceOptionValues($first: Int!, $offset: Int!) {
    preferenceOptionValues(first: $first, offset: $offset) {
      nodes {
        id
        title {
          id
          defaultMessage
        }
        slug
      }
    }
  }
`);

export const CREATE_OR_UPDATE_PREFERENCE_OPTION_VALUES: DocumentNode = parse(gql`
  mutation TranscendCliCreateOrUpdatePreferenceOptionValues(
    $input: CreateOrUpdatePreferenceOptionValuesInput!
  ) {
    createOrUpdatePreferenceOptionValues(input: $input) {
      preferenceOptionValues {
        id
        slug
      }
    }
  }
`);
