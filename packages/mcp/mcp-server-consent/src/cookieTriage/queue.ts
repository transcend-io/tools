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
import { resolveOrganization } from '../resolveOrganization.js';
import { attachBulkGroups, enrichItem } from './enrich.js';
import type {
  CookieTriageItem,
  CookieTriageOptions,
  CookieTriageOrganization,
  CookieTriagePurposeOption,
  CookieTriageRawNode,
  CookieTriageReviewType,
  CookieTriageSession,
  CookieTriageViewData,
} from './types.js';

/** Page size for data-flow fallback backlog fetch. */
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
    cookieId: cookie.id,
    createdAt: cookie.createdAt,
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
    createdAt: dataFlow.createdAt,
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

/**
 * Whether a cookie sorts strictly before the peek watermark (createdAt desc, id desc).
 *
 * @param createdAt - Candidate createdAt
 * @param cookieId - Candidate GraphQL id
 * @param headCreatedAt - Watermark createdAt
 * @param headId - Watermark GraphQL id
 * @returns True when the candidate is newer than the watermark
 */
export function isNewerThanWatermark(
  createdAt: string,
  cookieId: string,
  headCreatedAt: string,
  headId: string,
): boolean {
  if (createdAt > headCreatedAt) return true;
  if (createdAt < headCreatedAt) return false;
  return cookieId > headId;
}

/** One review-type slice of the backlog (data-flow fallback). */
export interface TriageQueueSlice {
  /** Cookie or data-flow */
  reviewType: CookieTriageReviewType;
  /** Enriched items still needing review */
  items: CookieTriageItem[];
}

/** Full backlog fetched for data-flow fallback. */
export interface TriageQueue {
  /** Cookies first, then data flows */
  slices: TriageQueueSlice[];
  /** Classification dropdown options */
  options: CookieTriageOptions;
  /** Active organization */
  organization?: CookieTriageOrganization;
}

/** Cookie page fetch result used by peek / forward selection. */
export interface CookiePageResult {
  /** First node, if any */
  node?: TranscendCookieGql;
  /** Matching NEEDS_REVIEW total */
  totalCount: number;
  /** endCursor for the returned node */
  endCursor?: string;
}

/**
 * Picks peek vs forward cookie for the next card.
 *
 * @param peek - Head-of-queue fetch (after unset)
 * @param forward - Forward fetch (after session cursor)
 * @param session - Current session watermarks
 * @returns Selected node, whether it came from peek, and which endCursor to store on the card
 */
export function selectCookieNode(
  peek: CookiePageResult,
  forward: CookiePageResult,
  session: CookieTriageSession,
): {
  /** Selected cookie */
  node?: TranscendCookieGql;
  /** True when the peek result won */
  fromPeek: boolean;
  /** endCursor from the winning fetch */
  endCursor?: string;
  /** totalCount from either response */
  totalCount: number;
} {
  const totalCount = Math.max(peek.totalCount, forward.totalCount);
  const peekNode = peek.node;
  const { headCreatedAt, headId } = session;

  if (
    peekNode &&
    headCreatedAt &&
    headId &&
    isNewerThanWatermark(peekNode.createdAt, peekNode.id, headCreatedAt, headId)
  ) {
    return {
      node: peekNode,
      fromPeek: true,
      endCursor: peek.endCursor,
      totalCount,
    };
  }

  if (forward.node) {
    return {
      node: forward.node,
      fromPeek: false,
      endCursor: forward.endCursor,
      totalCount,
    };
  }

  // First card / no watermark yet: prefer peek (same as forward when after is unset).
  if (peekNode) {
    return {
      node: peekNode,
      fromPeek: false,
      endCursor: peek.endCursor,
      totalCount,
    };
  }

  return { fromPeek: false, totalCount };
}

/**
 * Builds the next session fields after showing a cookie card.
 *
 * @param session - Incoming session
 * @param node - Shown cookie
 * @param fromPeek - Whether the card came from peek
 * @param endCursor - endCursor from the winning fetch
 * @returns Updated session cursors for the response payload
 */
export function sessionAfterShowingCookie(
  session: CookieTriageSession,
  node: TranscendCookieGql,
  fromPeek: boolean,
  endCursor?: string,
): CookieTriageSession {
  const sessionIndex = (session.sessionIndex ?? 0) + 1;
  const headCreatedAt = session.headCreatedAt ?? node.createdAt;
  const headId = session.headId ?? node.id;
  return {
    after: fromPeek ? session.after : (endCursor ?? session.after),
    headCreatedAt,
    headId,
    sessionIndex,
    fromPeek,
    cardEndCursor: endCursor,
    cardCookieId: node.id,
    cardCreatedAt: node.createdAt,
    dataFlowSkipCount: session.dataFlowSkipCount,
  };
}

/**
 * Advances session cursors for a skip on the current cookie card.
 *
 * @param session - Session from the card being skipped
 * @returns Session to pass into the next fetch
 */
export function sessionAfterSkipCookie(session: CookieTriageSession): CookieTriageSession {
  const raisedHead =
    session.cardCreatedAt && session.cardCookieId
      ? { headCreatedAt: session.cardCreatedAt, headId: session.cardCookieId }
      : {
          headCreatedAt: session.headCreatedAt,
          headId: session.headId,
        };

  return {
    ...raisedHead,
    // Peek skips raise the watermark only; forward skips advance `after`.
    after: session.fromPeek ? session.after : (session.cardEndCursor ?? session.after),
    sessionIndex: session.sessionIndex,
    dataFlowSkipCount: session.dataFlowSkipCount,
  };
}

/**
 * Fetches a single NEEDS_REVIEW cookie page (peek or forward).
 *
 * Cursor mode must not pass custom `orderBy` (API keyset is createdAt+id).
 * Offset/first-page peek may pass createdAt desc explicitly.
 *
 * @param clients - GraphQL clients
 * @param airgapBundleId - Consent manager bundle id
 * @param after - Forward cursor, or undefined for the head page
 * @returns Page result
 */
async function fetchCookiePage(
  clients: ToolClients,
  airgapBundleId: string,
  after?: string,
): Promise<CookiePageResult> {
  const useCursor = Boolean(after);
  const data = await clients.graphql.makeRequest<TranscendCliCookiesResponse>(COOKIES, {
    input: { airgapBundleId },
    first: 1,
    ...(useCursor
      ? { after }
      : {
          offset: 0,
          orderBy: [{ field: CookieOrderField.CreatedAt, direction: OrderDirection.Desc }],
        }),
    filterBy: { status: ConsentTrackerStatus.NeedsReview },
  });

  const node = data.cookies.nodes[0];
  return {
    node,
    totalCount: data.cookies.totalCount,
    endCursor: data.cookies.pageInfo?.endCursor ?? undefined,
  };
}

/**
 * Loads purposes + organization for triage cards.
 *
 * @param clients - Tool clients
 * @returns Options and organization
 */
async function loadTriageMeta(clients: ToolClients): Promise<{
  options: CookieTriageOptions;
  organization: CookieTriageOrganization;
}> {
  const [organization, purposesResponse] = await Promise.all([
    resolveOrganization(clients.graphql),
    clients.graphql.makeRequest<TranscendCliPurposesResponse>(PURPOSES, {
      first: 100,
    }),
  ]);

  return {
    organization,
    options: {
      purposes: purposesToOptions(purposesResponse.purposes.nodes),
      services: [],
    },
  };
}

/**
 * Fetches the next cookie review card via parallel peek + forward cursor fetches.
 *
 * @param clients - Tool clients
 * @param session - Cursor / watermark session
 * @returns View payload, or undefined when no cookies remain
 */
export async function fetchNextCookieCard(
  clients: ToolClients,
  session: CookieTriageSession = {},
): Promise<CookieTriageViewData | undefined> {
  const airgapBundleId = await resolveAirgapBundleId(clients.graphql);

  const [peek, forward, meta] = await Promise.all([
    fetchCookiePage(clients, airgapBundleId),
    fetchCookiePage(clients, airgapBundleId, session.after),
    loadTriageMeta(clients),
  ]);

  const selected = selectCookieNode(peek, forward, session);
  if (!selected.node) {
    return undefined;
  }

  const item = enrichItem(cookieToRawNode(selected.node));
  const nextSession = sessionAfterShowingCookie(
    session,
    selected.node,
    selected.fromPeek,
    selected.endCursor,
  );

  const services = collectServiceOptions([item]);

  return {
    reviewType: 'cookie',
    index: nextSession.sessionIndex,
    total: selected.totalCount,
    item,
    options: { ...meta.options, services },
    organization: meta.organization,
    ...nextSession,
  };
}

/**
 * Fetches NEEDS_REVIEW data flows for fallback when the cookie queue is empty.
 *
 * @param clients - GraphQL / REST clients
 * @returns Queue slice and options (organization loaded separately by caller)
 */
export async function buildDataFlowQueue(clients: ToolClients): Promise<TriageQueue> {
  const airgapBundleId = await resolveAirgapBundleId(clients.graphql);

  const [dataFlowsResponse, meta] = await Promise.all([
    clients.graphql.makeRequest<TranscendCliDataFlowsResponse>(DATA_FLOWS, {
      input: { airgapBundleId },
      first: TRIAGE_QUEUE_PAGE_SIZE,
      offset: 0,
      filterBy: { status: ConsentTrackerStatus.NeedsReview },
      orderBy: [{ field: DataFlowOrderField.CreatedAt, direction: OrderDirection.Desc }],
    }),
    loadTriageMeta(clients),
  ]);

  const dataFlowItems = attachBulkGroups(
    dataFlowsResponse.dataFlows.nodes.map((node) => enrichItem(dataFlowToRawNode(node))),
  );

  return {
    slices: [{ reviewType: 'data_flow', items: dataFlowItems }],
    options: {
      ...meta.options,
      services: collectServiceOptions(dataFlowItems),
    },
    organization: meta.organization,
  };
}

/**
 * @deprecated Prefer {@link fetchNextCookieCard}. Kept for tests that build in-memory queues.
 * Fetches NEEDS_REVIEW cookies and data flows, plus purposes, and enriches them.
 *
 * @param clients - GraphQL / REST clients
 * @returns Queue slices and dropdown options
 */
export async function buildQueue(clients: ToolClients): Promise<TriageQueue> {
  const airgapBundleId = await resolveAirgapBundleId(clients.graphql);

  const [cookiesResponse, dataFlowsResponse, meta] = await Promise.all([
    clients.graphql.makeRequest<TranscendCliCookiesResponse>(COOKIES, {
      input: { airgapBundleId },
      first: TRIAGE_QUEUE_PAGE_SIZE,
      offset: 0,
      filterBy: { status: ConsentTrackerStatus.NeedsReview },
      orderBy: [{ field: CookieOrderField.CreatedAt, direction: OrderDirection.Desc }],
    }),
    clients.graphql.makeRequest<TranscendCliDataFlowsResponse>(DATA_FLOWS, {
      input: { airgapBundleId },
      first: TRIAGE_QUEUE_PAGE_SIZE,
      offset: 0,
      filterBy: { status: ConsentTrackerStatus.NeedsReview },
      orderBy: [{ field: DataFlowOrderField.CreatedAt, direction: OrderDirection.Desc }],
    }),
    loadTriageMeta(clients),
  ]);

  const cookieItems = attachBulkGroups(
    cookiesResponse.cookies.nodes.map((node) => enrichItem(cookieToRawNode(node))),
  );
  const dataFlowItems = attachBulkGroups(
    dataFlowsResponse.dataFlows.nodes.map((node) => enrichItem(dataFlowToRawNode(node))),
  );

  return {
    slices: [
      { reviewType: 'cookie', items: cookieItems },
      { reviewType: 'data_flow', items: dataFlowItems },
    ],
    options: {
      ...meta.options,
      services: collectServiceOptions([...cookieItems, ...dataFlowItems]),
    },
    organization: meta.organization,
  };
}

/**
 * Picks the current card from an in-memory queue (data-flow fallback).
 *
 * @param queue - Built triage queue
 * @param dataFlowSkipCount - How many data-flow items to skip from the start
 * @param session - Optional session fields to merge into the payload
 * @returns View payload for the next card (or empty-queue done state)
 */
export function selectCurrentCard(
  queue: TriageQueue,
  dataFlowSkipCount = 0,
  session: CookieTriageSession = {},
): CookieTriageViewData {
  for (const slice of queue.slices) {
    const start = slice.reviewType === 'data_flow' ? dataFlowSkipCount : 0;
    const remaining = slice.items.slice(start);
    if (remaining.length === 0) {
      continue;
    }

    const item = remaining[0]!;
    const withBulk = attachBulkGroups(remaining).find((candidate) => candidate.id === item.id)!;
    const sessionIndex = (session.sessionIndex ?? 0) + 1;

    return {
      reviewType: slice.reviewType,
      index: start + 1,
      total: slice.items.length,
      item: withBulk,
      options: queue.options,
      organization: queue.organization,
      sessionIndex,
      dataFlowSkipCount: slice.reviewType === 'data_flow' ? start : session.dataFlowSkipCount,
      after: session.after,
      headCreatedAt: session.headCreatedAt,
      headId: session.headId,
    };
  }

  return {
    total: 0,
    options: queue.options,
    organization: queue.organization,
    sessionIndex: session.sessionIndex,
    dataFlowSkipCount,
    after: session.after,
    headCreatedAt: session.headCreatedAt,
    headId: session.headId,
  };
}

/**
 * Loads the next triage card: cookie cursor queue first, then data-flow fallback.
 *
 * @param clients - Tool clients
 * @param session - Cursor / watermark session
 * @returns View payload
 */
export async function loadTriageCard(
  clients: ToolClients,
  session: CookieTriageSession = {},
): Promise<CookieTriageViewData> {
  const cookieCard = await fetchNextCookieCard(clients, session);
  if (cookieCard) {
    return cookieCard;
  }

  const queue = await buildDataFlowQueue(clients);
  return selectCurrentCard(queue, session.dataFlowSkipCount ?? 0, session);
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
      organization: data.organization,
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
    organization: data.organization,
    bulkGroup: data.item.bulkGroup
      ? {
          siblingCount: data.item.bulkGroup.siblingCount,
          service: data.item.bulkGroup.service,
        }
      : undefined,
    hint: 'On hosts with MCP Apps this opens an interactive review card. Use consent_bulk_triage to approve or junk items.',
  };
}
