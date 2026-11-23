import { gql } from 'graphql-request';

export const SILO_DISCOVERY_RESULTS = gql`
  query TranscendCliSiloDiscoveryResults($first: Int!, $offset: Int!) {
    siloDiscoveryResults(first: $first, offset: $offset) {
      nodes {
        id
        title
        resourceId
        country
        countrySubDivision
        plaintextContext
        status
        containsSensitiveData
        suggestedCatalog {
          title
        }
        plugin {
          dataSilo {
            title
          }
        }
      }
    }
  }
`;

export const UPDATE_DATA_SILO_DISCOVERY_RESULTS = gql`
  mutation TranscendCliUpdateDataSiloDiscoveryResults(
    $input: [UpdateDataSiloDiscoveryResultsInput!]!
  ) {
    updateDataSiloDiscoveryResults(input: $input) {
      dataSiloDiscoveryResults {
        id
      }
    }
  }
`;

export const MARK_DATA_SILO_DISCOVERY_RESULTS_JUNK = gql`
  mutation TranscendCliMarkDataSiloDiscoveryResultsJunk(
    $input: [MarkDataSiloDiscoveryResultsJunkInput!]!
  ) {
    markDataSiloDiscoveryResultsJunk(input: $input) {
      success
    }
  }
`;
