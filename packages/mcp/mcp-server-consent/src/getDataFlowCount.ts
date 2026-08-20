import type { TranscendGraphQLBase } from '@transcend-io/mcp-server-base';
import { ConsentTrackerStatus } from '@transcend-io/privacy-types';
import { DATA_FLOWS, type TranscendCliDataFlowsResponse } from '@transcend-io/sdk';

/** Filters for a lightweight data-flow `totalCount` query. */
export interface DataFlowCountFilter {
  /** Triage status */
  status: ConsentTrackerStatus;
  /** Junk flag — used to split LIVE into approved vs junk */
  isJunk?: boolean;
}

/** Live / needs-review / junk counts for one data-flow slice. */
export interface DataFlowBucketCounts {
  /** Approved (LIVE, not junk) items */
  liveCount: number;
  /** Items needing review */
  needReviewCount: number;
  /** Junked items */
  junkCount: number;
}

/**
 * Fetch `dataFlows.totalCount` without paging nodes.
 *
 * Uses `first: 1` so the payload stays small. The list API hides CSP rows
 * (including when `type: CSP` is set), so this count matches the Consent
 * Manager table, not `dataFlowStats`.
 */
export async function getDataFlowCount(
  graphql: TranscendGraphQLBase,
  airgapBundleId: string,
  filterBy: DataFlowCountFilter,
): Promise<number> {
  const data = await graphql.makeRequest<TranscendCliDataFlowsResponse>(DATA_FLOWS, {
    input: { airgapBundleId },
    first: 1,
    offset: 0,
    filterBy,
  });
  return data.dataFlows.totalCount;
}

/**
 * Hidden CSP remainder: backend stats include CSP, the list/UI do not.
 * Floors at 0 if the list is ever larger than the rollup.
 */
export function cspRemainder(statsCount: number, triageCount: number): number {
  return Math.max(0, statsCount - triageCount);
}
