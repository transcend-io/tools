import { ConsentManagerMetricBin } from '@transcend-io/privacy-types';
import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { CONSENT_MANAGER_ANALYTICS_DATA } from './gqls/consentManagerMetrics.js';

export interface ConsentManagerMetric {
  /** Name of metric */
  name: string;
  /** The metrics */
  points: {
    /** Key of metric */
    key: string;
    /** Value of metric */
    value: string;
  }[];
}

/**
 * Fetch consent manager analytics data
 *
 * @param client - GraphQL client
 * @param input - Input for fetching data
 * @param options - Options
 * @returns Consent manager purposes in the organization
 */
export async function fetchConsentManagerAnalyticsData(
  client: GraphQLClient,
  input: {
    /** Data source */
    dataSource:
      | 'PRIVACY_SIGNAL_TIMESERIES'
      | 'CONSENT_CHANGES_TIMESERIES'
      | 'CONSENT_SESSIONS_BY_REGIME';
    /** Start date, in ISO string format */
    startDate: string;
    /** End date, in ISO string format */
    endDate: string;
    /** Force refetching */
    forceRefetch?: boolean;
    /** Airgap bundle ID */
    airgapBundleId: string;
    /** Bin interval */
    binInterval: ConsentManagerMetricBin;
    /** Whether or not to smooth the time series */
    smoothTimeseries: false;
  },
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<ConsentManagerMetric[]> {
  const {
    analyticsData: { series },
  } = await makeGraphQLRequest<{
    /** Analytics data response */
    analyticsData: {
      /** Consent manager metrics */
      series: ConsentManagerMetric[];
    };
  }>(client, CONSENT_MANAGER_ANALYTICS_DATA, {
    variables: { input },
    logger: options.logger,
  });
  return series;
}
