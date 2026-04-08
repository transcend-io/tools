import {
  TranscendGraphQLBase,
  type AirgapBundle,
  type ConsentDataFlow,
  type ConsentTrackerStatus,
  type Cookie,
  type DataFlow,
  type ListOptions,
  type PaginatedResponse,
  type TrackingPurpose,
  type UpdateConsentDataFlowInput,
  type UpdateCookieInput,
} from '@transcend-io/mcp-server-core';

const COOKIE_FIELDS = `
  id
  name
  description
  trackingPurposes
  purposes { id name trackingType }
  frequency
  service { id title integrationName }
  isJunk
  isRegex
  source
  status
  createdAt
  updatedAt
  lastDiscoveredAt
  domains { id domain occurrences }
  occurrences
  consentSiteCountAllTime
  consentSiteCountLastWeek
`;

const DATA_FLOW_FIELDS = `
  id
  value
  description
  type
  trackingType
  purposes { id name trackingType }
  frequency
  service { id title integrationName }
  isJunk
  source
  status
  createdAt
  updatedAt
  lastDiscoveredAt
  occurrences
  consentSiteCountAllTime
  consentSiteCountLastWeek
`;

export interface CookieListOptions {
  airgapBundleId: string;
  first?: number;
  offset?: number;
  status?: ConsentTrackerStatus;
  isJunk?: boolean;
  showZeroActivity?: boolean;
  text?: string;
  service?: string;
  orderBy?: { field: string; direction: 'ASC' | 'DESC' }[];
}

export interface DataFlowListOptions {
  airgapBundleId: string;
  first?: number;
  offset?: number;
  status?: ConsentTrackerStatus;
  isJunk?: boolean;
  showZeroActivity?: boolean;
  text?: string;
  service?: string;
  orderBy?: { field: string; direction: 'ASC' | 'DESC' }[];
}

export class ConsentMixin extends TranscendGraphQLBase {
  async listAirgapBundles(_options?: ListOptions): Promise<PaginatedResponse<AirgapBundle>> {
    const query = `
      query GetConsentManager {
        consentManager {
          consentManager {
            id
            name
          }
        }
      }
    `;
    const data = await this.makeRequest<{
      consentManager: { consentManager: { id: string; name: string } };
    }>(query, {});
    const cm = data.consentManager.consentManager;
    const bundle: AirgapBundle = {
      id: cm.id,
      name: cm.name || 'Default Bundle',
      version: '1.0.0',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return {
      nodes: [bundle],
      pageInfo: { hasNextPage: false, hasPreviousPage: false },
      totalCount: 1,
    };
  }

  async listTrackingPurposes(_options?: ListOptions): Promise<PaginatedResponse<TrackingPurpose>> {
    const query = `
      query ListPurposes($first: Int) {
        purposes(first: $first) {
          nodes {
            id
            name
            trackingType
          }
          totalCount
        }
      }
    `;
    const data = await this.makeRequest<{
      purposes: { nodes: TrackingPurpose[]; totalCount: number };
    }>(query, { first: Math.min(_options?.first || 50, 100) });
    return {
      nodes: data.purposes.nodes,
      pageInfo: {
        hasNextPage: data.purposes.nodes.length < data.purposes.totalCount,
        hasPreviousPage: false,
      },
      totalCount: data.purposes.totalCount,
    };
  }

  async listDataFlows(options?: ListOptions): Promise<PaginatedResponse<DataFlow>> {
    const query = `
      query ListPurposesAsDataFlows($first: Int) {
        purposes(first: $first) {
          nodes {
            id
            name
            trackingType
          }
          totalCount
        }
      }
    `;
    const data = await this.makeRequest<{
      purposes: {
        nodes: Array<{ id: string; name: string; trackingType: string }>;
        totalCount: number;
      };
    }>(query, { first: Math.min(options?.first || 100, 100) });
    const flows: DataFlow[] = data.purposes.nodes.map((purpose) => ({
      id: purpose.id,
      name: purpose.name,
      type: purpose.trackingType,
      status: 'active',
      createdAt: new Date().toISOString(),
    }));
    return {
      nodes: flows,
      pageInfo: { hasNextPage: flows.length < data.purposes.totalCount, hasPreviousPage: false },
      totalCount: data.purposes.totalCount,
    };
  }

  async listCookies(options: CookieListOptions): Promise<PaginatedResponse<Cookie>> {
    const query = `
      query ListCookies(
        $input: AirgapBundleInput!,
        $first: Int,
        $offset: Int,
        $filterBy: CookiesFiltersInput,
        $orderBy: [CookieOrder!]
      ) {
        cookies(
          input: $input,
          first: $first,
          offset: $offset,
          filterBy: $filterBy,
          orderBy: $orderBy
        ) {
          nodes { ${COOKIE_FIELDS} }
          totalCount
        }
      }
    `;
    const filterBy: Record<string, unknown> = {};
    if (options.status !== undefined) filterBy.status = options.status;
    if (options.isJunk !== undefined) filterBy.isJunk = options.isJunk;
    if (options.showZeroActivity !== undefined)
      filterBy.showZeroActivity = options.showZeroActivity;
    if (options.text) filterBy.text = options.text;
    if (options.service) filterBy.service = options.service;

    const data = await this.makeRequest<{
      cookies: { nodes: Cookie[]; totalCount: number };
    }>(query, {
      input: { airgapBundleId: options.airgapBundleId },
      first: options.first || 50,
      offset: options.offset || 0,
      filterBy: Object.keys(filterBy).length > 0 ? filterBy : undefined,
      orderBy: options.orderBy,
    });

    const total = data.cookies.totalCount;
    const returned = data.cookies.nodes.length;
    const currentOffset = options.offset || 0;

    return {
      nodes: data.cookies.nodes,
      pageInfo: {
        hasNextPage: currentOffset + returned < total,
        hasPreviousPage: currentOffset > 0,
      },
      totalCount: total,
    };
  }

  async listConsentDataFlows(
    options: DataFlowListOptions,
  ): Promise<PaginatedResponse<ConsentDataFlow>> {
    const query = `
      query ListConsentDataFlows(
        $input: AirgapBundleInput!,
        $first: Int,
        $offset: Int,
        $filterBy: DataFlowsFiltersInput,
        $orderBy: [DataFlowOrder!]
      ) {
        dataFlows(
          input: $input,
          first: $first,
          offset: $offset,
          filterBy: $filterBy,
          orderBy: $orderBy
        ) {
          nodes { ${DATA_FLOW_FIELDS} }
          totalCount
        }
      }
    `;
    const filterBy: Record<string, unknown> = {};
    if (options.status !== undefined) filterBy.status = options.status;
    if (options.isJunk !== undefined) filterBy.isJunk = options.isJunk;
    if (options.showZeroActivity !== undefined)
      filterBy.showZeroActivity = options.showZeroActivity;
    if (options.text) filterBy.text = options.text;
    if (options.service) filterBy.service = options.service;

    const data = await this.makeRequest<{
      dataFlows: { nodes: ConsentDataFlow[]; totalCount: number };
    }>(query, {
      input: { airgapBundleId: options.airgapBundleId },
      first: options.first || 50,
      offset: options.offset || 0,
      filterBy: Object.keys(filterBy).length > 0 ? filterBy : undefined,
      orderBy: options.orderBy,
    });

    const total = data.dataFlows.totalCount;
    const returned = data.dataFlows.nodes.length;
    const currentOffset = options.offset || 0;

    return {
      nodes: data.dataFlows.nodes,
      pageInfo: {
        hasNextPage: currentOffset + returned < total,
        hasPreviousPage: currentOffset > 0,
      },
      totalCount: total,
    };
  }

  async getCookieStats(
    airgapBundleId: string,
  ): Promise<{ cookies: Record<string, number>; dataFlows: Record<string, number> }> {
    const cookieQuery = `
      query CookieStats($input: AirgapBundleInput!) {
        cookieStats(input: $input) { liveCount needReviewCount junkCount }
      }
    `;
    const dfQuery = `
      query DataFlowStats($input: AirgapBundleInput!) {
        dataFlowStats(input: $input) { liveCount needReviewCount junkCount }
      }
    `;
    const input = { airgapBundleId };
    const [cookieData, dfData] = await Promise.all([
      this.makeRequest<{
        cookieStats: {
          liveCount: number;
          needReviewCount: number;
          junkCount: number;
        };
      }>(cookieQuery, { input }),
      this.makeRequest<{
        dataFlowStats: {
          liveCount: number;
          needReviewCount: number;
          junkCount: number;
        };
      }>(dfQuery, { input }),
    ]);
    return {
      cookies: cookieData.cookieStats,
      dataFlows: dfData.dataFlowStats,
    };
  }

  async updateCookies(
    airgapBundleId: string,
    cookies: UpdateCookieInput[],
  ): Promise<{ cookies: UpdateCookieInput[] }> {
    const query = `
      mutation UpdateOrCreateCookies($input: UpdateOrCreateCookiesInput!) {
        updateOrCreateCookies(input: $input) {
          clientMutationId
        }
      }
    `;
    await this.makeRequest<{
      updateOrCreateCookies: { clientMutationId: string | null };
    }>(query, {
      input: { airgapBundleId, cookies },
    });
    return { cookies };
  }

  async updateConsentDataFlows(
    airgapBundleId: string,
    dataFlows: UpdateConsentDataFlowInput[],
    classifyService?: boolean,
  ): Promise<{ dataFlows: ConsentDataFlow[] }> {
    const query = `
      mutation UpdateDataFlows($input: UpdateDataFlowsInput!) {
        updateDataFlows(input: $input) {
          dataFlows { ${DATA_FLOW_FIELDS} }
        }
      }
    `;
    const data = await this.makeRequest<{
      updateDataFlows: { dataFlows: ConsentDataFlow[] };
    }>(query, {
      input: {
        airgapBundleId,
        dataFlows,
        ...(classifyService !== undefined ? { classifyService } : {}),
      },
    });
    return { dataFlows: data.updateDataFlows.dataFlows };
  }

  async deleteCookies(airgapBundleId: string, ids: string[]): Promise<{ success: boolean }> {
    const query = `
      mutation DeleteCookies($input: DeleteCookiesInput!) {
        deleteCookies(input: $input) { clientMutationId }
      }
    `;
    await this.makeRequest(query, {
      input: { airgapBundleId, ids },
    });
    return { success: true };
  }

  async deleteConsentDataFlows(
    airgapBundleId: string,
    ids: string[],
  ): Promise<{ success: boolean }> {
    const query = `
      mutation DeleteDataFlows($input: DeleteDataFlowsInput!) {
        deleteDataFlows(input: $input) { clientMutationId }
      }
    `;
    await this.makeRequest(query, {
      input: { airgapBundleId, ids },
    });
    return { success: true };
  }
}
