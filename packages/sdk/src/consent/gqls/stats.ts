import { gql } from 'graphql-request';

/** Stats counts returned by COOKIE_STATS and DATA_FLOW_STATS */
export interface TranscendTrackerStatsGql {
  /** Number of live (approved) items */
  liveCount: number;
  /** Number of items needing review */
  needReviewCount: number;
  /** Number of junked items */
  junkCount: number;
}

/** Full response from the COOKIE_STATS query */
export interface TranscendCliCookieStatsResponse {
  /** Cookie stats result */
  cookieStats: TranscendTrackerStatsGql;
}

export const COOKIE_STATS = gql`
  query TranscendCliCookieStats($input: AirgapBundleInput!, $filterBy: CookiesFiltersInput) {
    cookieStats(input: $input, filterBy: $filterBy) {
      liveCount
      needReviewCount
      junkCount
    }
  }
`;

/** Full response from the DATA_FLOW_STATS query */
export interface TranscendCliDataFlowStatsResponse {
  /** Data flow stats result */
  dataFlowStats: TranscendTrackerStatsGql;
}

export const DATA_FLOW_STATS = gql`
  query TranscendCliDataFlowStats($input: AirgapBundleInput!, $filterBy: DataFlowsFiltersInput) {
    dataFlowStats(input: $input, filterBy: $filterBy) {
      liveCount
      needReviewCount
      junkCount
    }
  }
`;
