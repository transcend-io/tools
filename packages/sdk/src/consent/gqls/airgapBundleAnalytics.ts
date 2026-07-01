import { gql } from 'graphql-request';

/** Dimension values on an aggregate analytics row */
export interface AirgapBundleAggregateAnalyticsDimensionsGql {
  /** Consent value (true = opted in, false = opted out) */
  NEW_VALUE?: string;
  /** Privacy regime */
  REGIME?: string;
  /** Tracking purpose */
  PURPOSE?: string;
}

/** Single row from airgapBundleAggregateAnalytics */
export interface AirgapBundleAggregateAnalyticsItemGql {
  /** Count or measure value */
  measure: string;
  /** Breakdown dimensions when requested */
  dimensions?: AirgapBundleAggregateAnalyticsDimensionsGql;
}

/** Single row from airgapBundleTimeseriesAnalytics */
export interface AirgapBundleTimeseriesAnalyticsItemGql {
  /** Bin timestamp */
  time: string;
  /** Metric name */
  metric: string;
  /** Count or measure value */
  measure: string;
}

/** Full response from AIRGAP_BUNDLE_AGGREGATE_ANALYTICS */
export interface TranscendCliAirgapBundleAggregateAnalyticsResponse {
  /** Aggregate analytics result */
  airgapBundleAggregateAnalytics: {
    /** Analytics rows */
    items: AirgapBundleAggregateAnalyticsItemGql[];
  };
}

/** Full response from AIRGAP_BUNDLE_TIMESERIES_ANALYTICS */
export interface TranscendCliAirgapBundleTimeseriesAnalyticsResponse {
  /** Timeseries analytics result */
  airgapBundleTimeseriesAnalytics: {
    /** Timeseries rows */
    items: AirgapBundleTimeseriesAnalyticsItemGql[];
  };
}

export const AIRGAP_BUNDLE_AGGREGATE_ANALYTICS = gql`
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
`;

export const AIRGAP_BUNDLE_TIMESERIES_ANALYTICS = gql`
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
`;
