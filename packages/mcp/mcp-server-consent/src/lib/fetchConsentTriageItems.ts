import type { ToolClients } from '@transcend-io/mcp-server-base';
import { ConsentTrackerStatus } from '@transcend-io/privacy-types';
import {
  COOKIES,
  DATA_FLOWS,
  type TranscendCliCookiesResponse,
  type TranscendCliDataFlowsResponse,
} from '@transcend-io/sdk';

import { resolveAirgapBundleId } from '../resolveAirgapBundleId.js';
import type { ConsentTriageType, CookieTriageAnalysis } from './cookieTriageTypes.js';
import { COOKIE_TRIAGE_MAX_PER_PURPOSE } from './groupCookiesForTriage.js';
import { projectCookieForTriage, projectDataFlowForTriage } from './projectTriageItem.js';

/** Page size when the triage app pulls NEEDS_REVIEW items */
export const COOKIE_TRIAGE_FETCH_PAGE_SIZE = 100;

/** Soft cap for a single triage app open across all purpose tabs */
export const COOKIE_TRIAGE_FETCH_MAX = COOKIE_TRIAGE_MAX_PER_PURPOSE * 6;

const ORGANIZATION_NAME_QUERY = `
  query ConsentTriageOrganization {
    organization {
      name
    }
  }
`;

/**
 * Fetch the organization display name for the triage header.
 *
 * @param clients - MCP tool GraphQL clients
 * @returns Organization name, or a fallback when missing
 */
export async function fetchTriageOrganizationName(clients: ToolClients): Promise<string> {
  const data = await clients.graphql.makeRequest<{
    organization: {
      name: string;
    };
  }>(ORGANIZATION_NAME_QUERY);
  return data.organization.name || 'Organization';
}

/**
 * Paginate NEEDS_REVIEW cookies up to {@link COOKIE_TRIAGE_FETCH_MAX}.
 *
 * @param clients - MCP tool GraphQL clients
 * @returns Projected cookie rows for the triage UI
 */
export async function fetchCookiesForTriage(clients: ToolClients): Promise<CookieTriageAnalysis[]> {
  const airgapBundleId = await resolveAirgapBundleId(clients.graphql);
  const items: CookieTriageAnalysis[] = [];
  let offset = 0;

  while (items.length < COOKIE_TRIAGE_FETCH_MAX) {
    const pageSize = Math.min(
      COOKIE_TRIAGE_FETCH_PAGE_SIZE,
      COOKIE_TRIAGE_FETCH_MAX - items.length,
    );
    const data = await clients.graphql.makeRequest<TranscendCliCookiesResponse>(COOKIES, {
      input: { airgapBundleId },
      first: pageSize,
      offset,
      filterBy: { status: ConsentTrackerStatus.NeedsReview },
    });
    const { nodes, totalCount } = data.cookies;
    items.push(...nodes.map(projectCookieForTriage));
    offset += nodes.length;
    if (nodes.length === 0 || offset >= totalCount) {
      break;
    }
  }

  return items;
}

/**
 * Paginate NEEDS_REVIEW data flows up to {@link COOKIE_TRIAGE_FETCH_MAX}.
 *
 * @param clients - MCP tool GraphQL clients
 * @returns Projected data-flow rows for the triage UI
 */
export async function fetchDataFlowsForTriage(
  clients: ToolClients,
): Promise<CookieTriageAnalysis[]> {
  const airgapBundleId = await resolveAirgapBundleId(clients.graphql);
  const items: CookieTriageAnalysis[] = [];
  let offset = 0;

  while (items.length < COOKIE_TRIAGE_FETCH_MAX) {
    const pageSize = Math.min(
      COOKIE_TRIAGE_FETCH_PAGE_SIZE,
      COOKIE_TRIAGE_FETCH_MAX - items.length,
    );
    const data = await clients.graphql.makeRequest<TranscendCliDataFlowsResponse>(DATA_FLOWS, {
      input: { airgapBundleId },
      first: pageSize,
      offset,
      filterBy: { status: ConsentTrackerStatus.NeedsReview },
    });
    const { nodes, totalCount } = data.dataFlows;
    items.push(...nodes.map(projectDataFlowForTriage));
    offset += nodes.length;
    if (nodes.length === 0 || offset >= totalCount) {
      break;
    }
  }

  return items;
}

/**
 * Fetch NEEDS_REVIEW cookies or data flows for the triage app.
 *
 * @param clients - MCP tool GraphQL clients
 * @param triageType - Whether to load cookies or data flows
 * @returns Projected triage rows
 */
export async function fetchConsentTriageItems(
  clients: ToolClients,
  triageType: ConsentTriageType,
): Promise<CookieTriageAnalysis[]> {
  return triageType === 'cookies'
    ? fetchCookiesForTriage(clients)
    : fetchDataFlowsForTriage(clients);
}
