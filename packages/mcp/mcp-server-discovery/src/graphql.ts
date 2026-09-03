import {
  derivePageInfo,
  TranscendGraphQLBase,
  type ClassificationScan,
  type DiscoveryPlugin,
  type ListOptions,
  type PaginatedResponse,
} from '@transcend-io/mcp-server-base';

import { graphql } from './__generated__/gql.js';

const ListDataSilosForClassificationDoc = graphql(/* GraphQL */ `
  query DiscoveryListDataSilos($first: Int, $offset: Int) {
    dataSilos(first: $first, offset: $offset) {
      nodes {
        id
        title
        type
        createdAt
      }
      totalCount
    }
  }
`);

const ListDataSiloTypesDoc = graphql(/* GraphQL */ `
  query DiscoveryListDataSiloTypes($first: Int, $offset: Int) {
    dataSilos(first: $first, offset: $offset) {
      nodes {
        id
        title
        type
        description
      }
      totalCount
    }
  }
`);

export class DiscoveryMixin extends TranscendGraphQLBase {
  async listClassificationScans(
    options?: ListOptions,
  ): Promise<PaginatedResponse<ClassificationScan>> {
    const offset = options?.offset ?? 0;
    const data = await this.makeRequest(ListDataSilosForClassificationDoc, {
      first: Math.min(options?.first ?? 50, 100),
      offset,
    });
    const scans: ClassificationScan[] = data.dataSilos.nodes.map((silo) => ({
      id: silo.id,
      name: `Classification: ${silo.title}`,
      type: silo.type,
      status: 'COMPLETED',
      dataSiloId: silo.id,
      createdAt: silo.createdAt,
    }));
    return {
      nodes: scans,
      pageInfo: derivePageInfo({
        offset,
        nodeCount: scans.length,
        totalCount: data.dataSilos.totalCount,
      }),
      totalCount: data.dataSilos.totalCount,
    };
  }

  async listDiscoveryPlugins(options?: ListOptions): Promise<PaginatedResponse<DiscoveryPlugin>> {
    const offset = options?.offset ?? 0;
    const data = await this.makeRequest(ListDataSiloTypesDoc, {
      first: options?.first ?? 50,
      offset,
    });
    const typeMap = new Map<string, DiscoveryPlugin>();
    data.dataSilos.nodes.forEach((silo) => {
      if (!typeMap.has(silo.type)) {
        typeMap.set(silo.type, {
          id: silo.type,
          name: silo.type.replace(/([A-Z])/g, ' $1').trim(),
          type: silo.type,
          description: `Integration for ${silo.type}`,
          isEnabled: true,
        });
      }
    });
    const plugins = Array.from(typeMap.values());
    return {
      nodes: plugins,
      pageInfo: derivePageInfo({
        offset,
        nodeCount: data.dataSilos.nodes.length,
        totalCount: data.dataSilos.totalCount,
      }),
      totalCount: data.dataSilos.totalCount,
    };
  }
}
