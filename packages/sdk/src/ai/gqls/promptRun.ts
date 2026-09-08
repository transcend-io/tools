import { gql } from 'graphql-request';

export const ADD_MESSAGES_TO_PROMPT_RUN = gql`
  mutation TranscendCliAddMessagesToPromptRun($input: AddMessagesToPromptRunInput!) {
    addMessagesToPromptRun(input: $input) {
      clientMutationId
      promptRun {
        id
      }
    }
  }
`;
