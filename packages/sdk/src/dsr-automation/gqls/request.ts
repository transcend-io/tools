import { gql } from 'graphql-request';

export const REQUESTS_COUNT = gql`
  query TranscendCliRequestsCount($filterBy: RequestFiltersInput!) {
    requests(filterBy: $filterBy, first: 0, useMaster: false) {
      totalCount
    }
  }
`;

export const REQUESTS = gql`
  query TranscendCliRequests($first: Int!, $after: String, $filterBy: RequestFiltersInput!) {
    requests(
      filterBy: $filterBy
      first: $first
      after: $after
      orderBy: [{ field: createdAt, direction: ASC }, { field: id, direction: ASC }]
      useMaster: false
    ) {
      nodes {
        id
        createdAt
        email
        link
        status
        details
        isTest
        locale
        origin
        isSilent
        coreIdentifier
        daysRemaining
        successfullyCompletedAt
        type
        subjectType
        country
        countrySubDivision
        purpose {
          title
          name
          consent
          enrichedPreferences {
            topic
            selectValues {
              id
              name
              preferenceOption {
                id
                slug
                title {
                  defaultMessage
                }
              }
            }
            selectValue {
              id
              name
            }
            selectValue {
              id
              name
            }
            preferenceTopic {
              title {
                defaultMessage
              }
              id
              slug
            }
            name
            id
            booleanValue
          }
        }
        attributeValues {
          id
          name
          attributeKey {
            id
            name
          }
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`;

export const REDUCED_REQUESTS_FOR_DATA_SILO_COUNT = gql`
  query TranscendCliListReducedRequestsForDataSiloCount(
    $input: BulkCompletionReducedRequestInput!
  ) {
    listReducedRequestsForDataSilo(input: $input) {
      totalCount
    }
  }
`;
