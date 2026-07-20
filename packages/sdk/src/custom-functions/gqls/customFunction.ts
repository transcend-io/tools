import { gql } from 'graphql-request';

export const CUSTOM_FUNCTIONS = gql`
  query TranscendCliCustomFunctions($first: Int!, $offset: Int!, $text: String) {
    customFunctions(first: $first, offset: $offset, filterBy: { text: $text }) {
      nodes {
        id
        name
        description
        type
        lifecycleState
        signedCodeJwt
        signedCodeContextJwt
        hasPendingDraft
        activeVersion {
          id
          versionNumber
          lifecycleState
          signedCodeJwt
        }
        draftVersion {
          id
          versionNumber
          lifecycleState
          signedCodeJwt
        }
      }
      totalCount
    }
  }
`;

export const CREATE_CUSTOM_FUNCTION = gql`
  mutation TranscendCliCreateCustomFunction(
    $input: CreateCustomFunctionInput!
    $dhEncrypted: String!
  ) {
    createCustomFunction(input: $input, dhEncrypted: $dhEncrypted) {
      customFunction {
        id
        name
        activeVersion {
          id
          versionNumber
        }
        draftVersion {
          id
          versionNumber
        }
      }
      success
    }
  }
`;

export const UPDATE_STANDALONE_CUSTOM_FUNCTION = gql`
  mutation TranscendCliUpdateStandaloneCustomFunction(
    $input: UpdateStandaloneCustomFunctionInput!
    $dhEncrypted: String
  ) {
    updateStandaloneCustomFunction(input: $input, dhEncrypted: $dhEncrypted) {
      customFunction {
        id
        name
        hasPendingDraft
        activeVersion {
          id
          versionNumber
        }
        draftVersion {
          id
          versionNumber
        }
      }
      success
    }
  }
`;

export const UPDATE_CUSTOM_FUNCTION = gql`
  mutation TranscendCliUpdateCustomFunction(
    $input: UpdateCustomFunctionInput!
    $dhEncrypted: String!
  ) {
    updateCustomFunction(input: $input, dhEncrypted: $dhEncrypted) {
      customFunction {
        id
        name
      }
      success
    }
  }
`;

export const PROMOTE_CUSTOM_FUNCTION_VERSION = gql`
  mutation TranscendCliPromoteCustomFunctionVersion($input: PromoteCustomFunctionVersionInput!) {
    promoteCustomFunctionVersion(input: $input) {
      customFunction {
        id
        activeVersion {
          id
          versionNumber
        }
      }
      dependencyWarnings {
        dependencyType
        dependencyTitle
        message
      }
      success
    }
  }
`;
