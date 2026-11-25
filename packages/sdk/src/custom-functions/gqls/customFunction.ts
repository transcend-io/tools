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
        sombraId
        dataSiloId
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

export const CREATE_CUSTOM_FUNCTION_DATA_SILO = gql`
  mutation TranscendCliCreateCustomFunctionDataSilo($input: [CreateDataSilosInput!]!) {
    createDataSilos(input: $input) {
      dataSilos {
        id
        title
      }
    }
  }
`;

export const DELETE_DATA_SILOS = gql`
  mutation TranscendCliDeleteDataSilos($input: DeleteDataSilosInput!) {
    deleteDataSilos(input: $input) {
      clientMutationId
    }
  }
`;

export const RUN_CUSTOM_FUNCTION = gql`
  mutation TranscendCliRunCustomFunction($input: RunCustomFunctionInput!) {
    runCustomFunction(input: $input) {
      result {
        exitCode
        error {
          message
          stack
        }
        logs {
          message
          file
        }
        profile {
          timeMs
        }
      }
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
