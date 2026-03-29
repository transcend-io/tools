import { parse, type DocumentNode } from 'graphql';
import { gql } from 'graphql-request';

export const CREATE_PREFERENCE_ACCESS_TOKENS: DocumentNode = parse(gql`
  mutation TranscendCliCreatePreferenceAccessTokens($input: CreatePrivacyCenterAccessTokensInput!) {
    createPrivacyCenterAccessTokens(input: $input) {
      nodes {
        token
      }
    }
  }
`);
