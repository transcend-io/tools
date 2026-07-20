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
  mutation TranscendCliCreateCustomFunction($input: CreateCustomFunctionInput!) {
    createCustomFunction(input: $input) {
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
  ) {
    updateStandaloneCustomFunction(input: $input) {
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
