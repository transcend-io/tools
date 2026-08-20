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

/**
 * Fetch `dataFlows.totalCount` without paging nodes.
 *
 * Uses `first: 1` so the payload stays small. The list API hides CSP rows
 * (same as the Consent Manager table), so these counts match what users see.
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
