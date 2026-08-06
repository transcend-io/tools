import type { ToolClients } from '@transcend-io/mcp-server-base';
import { ConsentTrackerStatus } from '@transcend-io/privacy-types';
import {
  UPDATE_OR_CREATE_COOKIES,
  UPDATE_DATA_FLOWS,
  type TranscendUpdateCookieInputGql,
  type TranscendUpdateDataFlowInputGql,
  type TranscendCliUpdateOrCreateCookiesResponse,
  type TranscendCliUpdateDataFlowsResponse,
} from '@transcend-io/sdk';

import { resolveAirgapBundleId } from '../resolveAirgapBundleId.js';
import type { CookieTriageReviewType } from './types.js';

/** One item to approve or junk in a triage mutation. */
export interface TriageMutateItem {
  /** Mutation key (cookie name or data-flow UUID) */
  id: string;
  /** Cookie or data flow */
  reviewType: CookieTriageReviewType;
  /** Purpose slug for cookies; also used to resolve purposeId for data flows */
  purposeSlug?: string;
  /** Purpose UUID for data-flow purposeIds */
  purposeId?: string;
  /** Service integration name / title */
  service?: string;
}

/**
 * Approves or junks one or more triage items via the same GraphQL paths as
 * `consent_bulk_triage`.
 *
 * @param clients - GraphQL clients
 * @param items - Items to mutate
 * @param action - Approve (LIVE) or junk
 */
export async function mutateTriageItems(
  clients: ToolClients,
  items: TriageMutateItem[],
  action: 'approve' | 'junk',
): Promise<void> {
  if (items.length === 0) {
    return;
  }

  const airgapBundleId = await resolveAirgapBundleId(clients.graphql);
  const isJunk = action === 'junk';
  const cookieItems = items.filter((item) => item.reviewType === 'cookie');
  const dataFlowItems = items.filter((item) => item.reviewType === 'data_flow');

  if (cookieItems.length > 0) {
    const cookies: TranscendUpdateCookieInputGql[] = cookieItems.map((item) => ({
      name: item.id,
      status: ConsentTrackerStatus.Live,
      isJunk,
      ...(item.purposeSlug ? { trackingPurposes: [item.purposeSlug] } : {}),
      ...(item.service ? { service: item.service } : {}),
    }));
    await clients.graphql.makeRequest<TranscendCliUpdateOrCreateCookiesResponse>(
      UPDATE_OR_CREATE_COOKIES,
      { airgapBundleId, cookies },
    );
  }

  if (dataFlowItems.length > 0) {
    const dataFlows: TranscendUpdateDataFlowInputGql[] = dataFlowItems.map((item) => ({
      id: item.id,
      status: ConsentTrackerStatus.Live,
      isJunk,
      ...(item.purposeId
        ? { purposeIds: [item.purposeId] }
        : item.purposeSlug
          ? { purposeIds: [item.purposeSlug] }
          : {}),
      ...(item.service ? { service: item.service } : {}),
    }));
    await clients.graphql.makeRequest<TranscendCliUpdateDataFlowsResponse>(UPDATE_DATA_FLOWS, {
      airgapBundleId,
      dataFlows,
    });
  }
}
