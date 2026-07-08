import type {
  AirgapBundleAnalyticsBinInterval,
  AirgapBundleAnalyticsDimension,
  AirgapBundleAnalyticsMetric,
} from '@transcend-io/privacy-types';
import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import {
  AIRGAP_BUNDLE_AGGREGATE_ANALYTICS,
  AIRGAP_BUNDLE_TIMESERIES_ANALYTICS,
  type AirgapBundleAggregateAnalyticsItemGql,
  type AirgapBundleTimeseriesAnalyticsItemGql,
  type TranscendCliAirgapBundleAggregateAnalyticsResponse,
  type TranscendCliAirgapBundleTimeseriesAnalyticsResponse,
} from './gqls/airgapBundleAnalytics.js';

/**
 * Fetch aggregate consent analytics for an airgap bundle.
 *
 * @see https://docs.transcend.io/docs/articles/consent-management/configuration/consent-stats-with-gql-api
 */
export async function fetchAirgapBundleAggregateAnalytics(
  client: GraphQLClient,
  input: {
    /** Airgap bundle ID */
    airgapBundleId: string;
    /** Analytics metric to query */
    metric: AirgapBundleAnalyticsMetric;
    /** Start time (epoch seconds) */
    start: number;
    /** End time (epoch seconds) */
    end: number;
    /** Optional dimension breakdowns */
    includeDimensions?: AirgapBundleAnalyticsDimension[];
  },
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<AirgapBundleAggregateAnalyticsItemGql[]> {
  const {
    airgapBundleAggregateAnalytics: { items },
  } = await makeGraphQLRequest<TranscendCliAirgapBundleAggregateAnalyticsResponse>(
    client,
    AIRGAP_BUNDLE_AGGREGATE_ANALYTICS,
    {
      variables: {
        id: input.airgapBundleId,
        input: {
          metric: input.metric,
          start: input.start,
          end: input.end,
          ...(input.includeDimensions?.length
            ? { includeDimensions: input.includeDimensions }
            : {}),
        },
      },
      logger: options.logger,
    },
  );
  return items;
}

/**
 * Fetch timeseries consent analytics for an airgap bundle.
 *
 * @see https://docs.transcend.io/docs/articles/consent-management/configuration/consent-stats-with-gql-api
 */
export async function fetchAirgapBundleTimeseriesAnalytics(
  client: GraphQLClient,
  input: {
    /** Airgap bundle ID */
    airgapBundleId: string;
    /** Analytics metric to query */
    metric: AirgapBundleAnalyticsMetric;
    /** Start time (epoch seconds) */
    start: number;
    /** End time (epoch seconds) */
    end: number;
    /** Time bin size */
    binInterval: AirgapBundleAnalyticsBinInterval;
  },
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<AirgapBundleTimeseriesAnalyticsItemGql[]> {
  const {
    airgapBundleTimeseriesAnalytics: { items },
  } = await makeGraphQLRequest<TranscendCliAirgapBundleTimeseriesAnalyticsResponse>(
    client,
    AIRGAP_BUNDLE_TIMESERIES_ANALYTICS,
    {
      variables: {
        id: input.airgapBundleId,
        input: {
          metric: input.metric,
          start: input.start,
          end: input.end,
          binInterval: input.binInterval,
        },
      },
      logger: options.logger,
    },
  );
  return items;
}
