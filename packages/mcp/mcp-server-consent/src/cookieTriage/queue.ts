import type { ToolClients } from '@transcend-io/mcp-server-base';
import {
  ConsentTrackerStatus,
  CookieOrderField,
  DataFlowOrderField,
  OrderDirection,
} from '@transcend-io/privacy-types';
import {
  COOKIES,
  DATA_FLOWS,
  PURPOSES,
  type TranscendCliCookiesResponse,
  type TranscendCliDataFlowsResponse,
  type TranscendCliPurposesResponse,
  type TranscendCookieGql,
  type TranscendDataFlowGql,
  type TranscendPurposeGql,
} from '@transcend-io/sdk';

import { resolveAirgapBundleId } from '../resolveAirgapBundleId.js';
import { attachBulkGroups, enrichItem } from './enrich.js';
import type {
  CookieTriageItem,
  CookieTriageOptions,
  CookieTriagePurposeOption,
  CookieTriageRawNode,
  CookieTriageReviewType,
  CookieTriageViewData,
} from './types.js';

/** Page size for one triage session backlog fetch. */
export const TRIAGE_QUEUE_PAGE_SIZE = 50;

/**
 * Maps a cookie GraphQL node into the raw shape enrichment expects.
 *
 * @param cookie - Cookie from the COOKIES query
 * @returns Raw triage node (mutation id = cookie name)
 */
export function cookieToRawNode(cookie: TranscendCookieGql): CookieTriageRawNode {
  const purpose = cookie.purposes[0];
  return {
    id: cookie.name,
    identifier: cookie.name,
    description: cookie.description,
    source: cookie.source,
    occurrences: cookie.occurrences,
    purposeName: purpose?.name,
    purposeSlug: purpose?.trackingType ?? cookie.trackingPurposes[0],
    purposeId: purpose?.id,
    serviceTitle: cookie.service?.title,
    serviceKey: cookie.service?.integrationName ?? cookie.service?.title,
  };
}

/**
 * Maps a data-flow GraphQL node into the raw shape enrichment expects.
 *
 * @param dataFlow - Data flow from the DATA_FLOWS query
 * @returns Raw triage node (mutation id = data-flow UUID)
 */
export function dataFlowToRawNode(dataFlow: TranscendDataFlowGql): CookieTriageRawNode {
  const purpose = dataFlow.purposes[0];
  return {
    id: dataFlow.id,
    identifier: dataFlow.value,
    description: dataFlow.description,
    source: dataFlow.source,
    occurrences: dataFlow.occurrences,
    purposeName: purpose?.name,
    purposeSlug: purpose?.trackingType ?? dataFlow.trackingType[0],
    purposeId: purpose?.id,
    serviceTitle: dataFlow.service?.title,
    serviceKey: dataFlow.service?.integrationName ?? dataFlow.service?.title,
  };
}

/**
 * Builds purpose dropdown options from the PURPOSES query.
 *
 * @param purposes - Purpose nodes
 * @returns Options for the classification select
 */
export function purposesToOptions(purposes: TranscendPurposeGql[]): CookieTriagePurposeOption[] {
  return purposes
    .filter((purpose) => purpose.isActive && !purpose.deletedAt)
    .map((purpose) => ({
      label: purpose.name || purpose.trackingType,
      value: purpose.trackingType,
      id: purpose.id,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Collects unique service titles from a triage queue for the service datalist.
 *
 * @param items - Enriched queue items
 * @returns Sorted unique service titles
 */
export function collectServiceOptions(items: CookieTriageItem[]): string[] {
  const titles = new Set<string>();
  for (const item of items) {
    if (item.classification.service) {
      titles.add(item.classification.service);
    }
  }
  return [...titles].sort((a, b) => a.localeCompare(b));
}

/** One review-type slice of the backlog. */
export interface TriageQueueSlice {
  /** Cookie or data-flow */
  reviewType: CookieTriageReviewType;
  /** Enriched items still needing review */
  items: CookieTriageItem[];
}

/** Full backlog fetched for a triage session. */
export interface TriageQueue {
  /** Cookies first, then data flows */
  slices: TriageQueueSlice[];
  /** Classification dropdown options */
  options: CookieTriageOptions;
}

/**
 * Fetches NEEDS_REVIEW cookies and data flows, plus purposes, and enriches them.
 *
 * @param clients - GraphQL / REST clients
 * @returns Queue slices and dropdown options
 */
export async function buildQueue(clients: ToolClients): Promise<TriageQueue> {
  const airgapBundleId = await resolveAirgapBundleId(clients.graphql);

  const [cookiesResponse, dataFlowsResponse, purposesResponse] = await Promise.all([
    clients.graphql.makeRequest<TranscendCliCookiesResponse>(COOKIES, {
      input: { airgapBundleId },
      first: TRIAGE_QUEUE_PAGE_SIZE,
      offset: 0,
      filterBy: { status: ConsentTrackerStatus.NeedsReview },
      orderBy: [{ field: CookieOrderField.Occurrences, direction: OrderDirection.Desc }],
    }),
    clients.graphql.makeRequest<TranscendCliDataFlowsResponse>(DATA_FLOWS, {
      input: { airgapBundleId },
      first: TRIAGE_QUEUE_PAGE_SIZE,
      offset: 0,
      filterBy: { status: ConsentTrackerStatus.NeedsReview },
      orderBy: [{ field: DataFlowOrderField.Occurrences, direction: OrderDirection.Desc }],
    }),
    clients.graphql.makeRequest<TranscendCliPurposesResponse>(PURPOSES, {
      first: 100,
    }),
  ]);

  const cookieItems = attachBulkGroups(
    cookiesResponse.cookies.nodes.map((node) => enrichItem(cookieToRawNode(node))),
  );
  const dataFlowItems = attachBulkGroups(
    dataFlowsResponse.dataFlows.nodes.map((node) => enrichItem(dataFlowToRawNode(node))),
  );

  const slices: TriageQueueSlice[] = [
    { reviewType: 'cookie', items: cookieItems },
    { reviewType: 'data_flow', items: dataFlowItems },
  ];

  const allItems = [...cookieItems, ...dataFlowItems];
  return {
    slices,
    options: {
      purposes: purposesToOptions(purposesResponse.purposes.nodes),
      services: collectServiceOptions(allItems),
    },
  };
}

/**
 * Picks the current card from a queue, respecting skipped ids.
 *
 * Cookies are preferred; when none remain, switches to data flows.
 *
 * @param queue - Built triage queue
 * @param skippedIds - Ids skipped this session
 * @returns View payload for the next card (or empty-queue done state)
 */
export function selectCurrentCard(
  queue: TriageQueue,
  skippedIds: string[] = [],
): CookieTriageViewData {
  const skipped = new Set(skippedIds);

  for (const slice of queue.slices) {
    const nextIdx = slice.items.findIndex((item) => !skipped.has(item.id));
    if (nextIdx === -1) {
      continue;
    }

    const remaining = slice.items.filter((item) => !skipped.has(item.id));
    const item = remaining[0]!;
    // Recompute bulk group against remaining siblings only.
    const withBulk = attachBulkGroups(remaining).find((candidate) => candidate.id === item.id)!;

    return {
      reviewType: slice.reviewType,
      index: nextIdx + 1,
      total: slice.items.length,
      item: withBulk,
      options: queue.options,
      skippedIds,
    };
  }

  return {
    total: 0,
    options: queue.options,
    skippedIds,
  };
}

/**
 * Compact text summary for hosts without MCP Apps.
 *
 * @param data - Current card payload
 * @returns Human-readable summary object
 */
export function summarizeCard(data: CookieTriageViewData): Record<string, unknown> {
  if (!data.item || !data.reviewType) {
    return {
      message: 'Triage queue is empty — nothing needs review.',
      total: 0,
    };
  }

  return {
    reviewType: data.reviewType,
    index: data.index,
    total: data.total,
    id: data.item.id,
    identifier: data.item.identifier,
    description: data.item.description,
    source: data.item.source,
    occurrences: data.item.occurrences.count,
    suggestion: data.item.suggestion,
    classification: data.item.classification,
    bulkGroup: data.item.bulkGroup
      ? {
          siblingCount: data.item.bulkGroup.siblingCount,
          service: data.item.bulkGroup.service,
        }
      : undefined,
    hint: 'On hosts with MCP Apps this opens an interactive review card. Use consent_bulk_triage to approve or junk items.',
  };
}
