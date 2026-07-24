/**
 * GraphQL operations for the Consent Management MCP server.
 *
 * Operations are authored with the generated `graphql()` tag so they are
 * validated against the committed `schema.graphql` at compile time — drift
 * between an operation (or the variables/enums we send) and the schema fails
 * `tsc` rather than surfacing as a runtime error. `TranscendGraphQLBase.makeRequest`
 * consumes the returned `TypedDocumentNode<Result, Variables>` natively.
 *
 * Run `pnpm codegen` after editing to regenerate `./__generated__/`.
 */
import { graphql } from './__generated__/gql.js';

// Input types (generated from the schema) used to build mutation variables.
export type { UpdateOrCreateCookieInput, UpdateDataFlowInput } from './__generated__/graphql.js';

export const FetchConsentManagerIdDoc = graphql(/* GraphQL */ `
  query TranscendCliFetchConsentManagerId {
    consentManager {
      consentManager {
        id
      }
    }
  }
`);

export const FetchConsentManagerDoc = graphql(/* GraphQL */ `
  query TranscendCliFetchConsentManager {
    consentManager {
      consentManager {
        id
        bundleURL
        testBundleURL
        configuration {
          domains
          consentPrecedence
          unknownRequestPolicy
          unknownCookiePolicy
          syncEndpoint
          telemetryPartitioning
          signedIabAgreement
          syncGroups
          partition
        }
        partition {
          partition
        }
      }
    }
  }
`);

export const CookiesDoc = graphql(/* GraphQL */ `
  query TranscendCliCookies(
    $input: AirgapBundleInput!
    $first: Int!
    $offset: Int!
    $filterBy: CookiesFiltersInput
    $orderBy: [CookieOrder!]
  ) {
    cookies(
      input: $input
      first: $first
      offset: $offset
      filterBy: $filterBy
      orderBy: $orderBy
      useMaster: false
    ) {
      totalCount
      nodes {
        id
        name
        isRegex
        description
        trackingPurposes
        purposes {
          id
          name
          trackingType
        }
        frequency
        service {
          id
          title
          integrationName
        }
        isJunk
        source
        status
        owners {
          id
          name
          email
        }
        teams {
          id
          name
        }
        attributeValues {
          id
          name
          attributeKey {
            id
            name
          }
        }
        createdAt
        updatedAt
        lastDiscoveredAt
        domains {
          id
          domain
          occurrences
        }
        occurrences
        consentSiteCountAllTime
        consentSiteCountLastWeek
      }
    }
  }
`);

export const DataFlowsDoc = graphql(/* GraphQL */ `
  query TranscendCliDataFlows(
    $input: AirgapBundleInput!
    $first: Int!
    $offset: Int!
    $filterBy: DataFlowsFiltersInput
    $orderBy: [DataFlowOrder!]
  ) {
    dataFlows(
      input: $input
      first: $first
      offset: $offset
      filterBy: $filterBy
      orderBy: $orderBy
      useMaster: false
    ) {
      totalCount
      nodes {
        id
        value
        type
        description
        trackingType
        purposes {
          id
          name
          trackingType
        }
        frequency
        service {
          id
          title
          integrationName
        }
        isJunk
        source
        status
        owners {
          id
          name
          email
        }
        teams {
          id
          name
        }
        attributeValues {
          id
          name
          attributeKey {
            id
            name
          }
        }
        createdAt
        updatedAt
        lastDiscoveredAt
        occurrences
        consentSiteCountAllTime
        consentSiteCountLastWeek
      }
    }
  }
`);

export const CookieStatsDoc = graphql(/* GraphQL */ `
  query TranscendCliCookieStats($input: AirgapBundleInput!) {
    cookieStats(input: $input) {
      liveCount
      needReviewCount
      junkCount
    }
  }
`);

export const DataFlowStatsDoc = graphql(/* GraphQL */ `
  query TranscendCliDataFlowStats($input: AirgapBundleInput!) {
    dataFlowStats(input: $input) {
      liveCount
      needReviewCount
      junkCount
    }
  }
`);

export const PurposesDoc = graphql(/* GraphQL */ `
  query TranscendCliPurposes($first: Int!) {
    purposes(first: $first) {
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
        preferenceTopics {
          id
          slug
          title {
            description
          }
          color
        }
        purposeDataPointCount
        preferenceTopicOptionValueDataPointCount
        mappedDataSilos {
          id
          title
          type
        }
      }
      totalCount
    }
  }
`);

export const ExperiencesDoc = graphql(/* GraphQL */ `
  query TranscendCliExperiences($first: Int!, $offset: Int!) {
    experiences(first: $first, offset: $offset, useMaster: false) {
      totalCount
      nodes {
        id
        name
        displayName
        regions {
          countrySubDivision
          country
        }
        operator
        displayPriority
        onConsentExpiry
        consentExpiry
        viewState
        purposes {
          name
          trackingType
        }
        optedOutPurposes {
          name
          trackingType
        }
        browserLanguages
        browserTimeZones
        consentUiVariant {
          id
          slug
        }
      }
    }
  }
`);

export const UpdateOrCreateCookiesDoc = graphql(/* GraphQL */ `
  mutation TranscendCliUpdateOrCreateCookies(
    $cookies: [UpdateOrCreateCookieInput!]!
    $airgapBundleId: ID!
  ) {
    updateOrCreateCookies(input: { airgapBundleId: $airgapBundleId, cookies: $cookies }) {
      clientMutationId
    }
  }
`);

export const UpdateDataFlowsDoc = graphql(/* GraphQL */ `
  mutation TranscendCliUpdateDataFlows($airgapBundleId: ID!, $dataFlows: [UpdateDataFlowInput!]!) {
    updateDataFlows(input: { airgapBundleId: $airgapBundleId, dataFlows: $dataFlows }) {
      dataFlows {
        id
        value
        type
        description
        trackingType
        purposes {
          id
          name
          trackingType
        }
        frequency
        service {
          id
          title
          integrationName
        }
        isJunk
        source
        status
        createdAt
        updatedAt
        lastDiscoveredAt
        occurrences
        consentSiteCountAllTime
        consentSiteCountLastWeek
      }
    }
  }
`);

export const ConsentManagerAnalyticsDataDoc = graphql(/* GraphQL */ `
  query TranscendCliConsentManagerAnalyticsData($input: AnalyticsInput!) {
    analyticsData(input: $input) {
      series {
        name
        points {
          key
          value
        }
      }
    }
  }
`);

export const AggregateAnalyticsDoc = graphql(/* GraphQL */ `
  query TranscendCliAirgapBundleAggregateAnalytics(
    $id: ID!
    $input: AirgapBundleAggregateAnalyticsInput!
  ) {
    airgapBundleAggregateAnalytics(id: $id, input: $input) {
      items {
        measure
        dimensions {
          NEW_VALUE
          REGIME
          PURPOSE
        }
      }
    }
  }
`);

export const TimeseriesAnalyticsDoc = graphql(/* GraphQL */ `
  query TranscendCliAirgapBundleTimeseriesAnalytics(
    $id: ID!
    $input: AirgapBundleTimeseriesAnalyticsInput!
  ) {
    airgapBundleTimeseriesAnalytics(id: $id, input: $input) {
      items {
        time
        metric
        measure
      }
    }
  }
`);
