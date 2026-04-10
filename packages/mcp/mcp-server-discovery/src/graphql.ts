import {
  TranscendGraphQLBase,
  type PaginatedResponse,
  type ClassificationScan,
  type DiscoveryPlugin,
  type ListOptions,
} from '@transcend-io/mcp-server-core';

export class DiscoveryMixin extends TranscendGraphQLBase {
  async listClassificationScans(
    options?: ListOptions,
  ): Promise<PaginatedResponse<ClassificationScan>> {
    const query = `
      query ListDataSilosForClassification($first: Int) {
        dataSilos(first: $first) {
          nodes {
            id
            title
            type
            createdAt
          }
          totalCount
        }
      }
    `;
    const data = await this.makeRequest<{
      dataSilos: {
        nodes: Array<{ id: string; title: string; type: string; createdAt: string }>;
        totalCount: number;
      };
    }>(query, { first: Math.min(options?.first || 50, 100) });
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
      pageInfo: { hasNextPage: scans.length < data.dataSilos.totalCount, hasPreviousPage: false },
      totalCount: data.dataSilos.totalCount,
    };
  }

  async startClassificationScan(input: {
    name: string;
    dataSiloId?: string;
    type?: string;
  }): Promise<ClassificationScan> {
    const mutation = `
      mutation StartClassificationScan($input: StartClassificationScanInput!) {
        startClassificationScan(input: $input) {
          scan {
            id
            name
            type
            status
            startedAt
            createdAt
          }
        }
      }
    `;
    const data = await this.makeRequest<{ startClassificationScan: { scan: ClassificationScan } }>(
      mutation,
      { input },
    );
    return data.startClassificationScan.scan;
  }

  async getClassificationScan(id: string): Promise<ClassificationScan> {
    const query = `
      query GetClassificationScan($id: ID!) {
        classificationScan(id: $id) {
          id
          name
          type
          status
          startedAt
          completedAt
          dataSiloId
          results {
            id
            path
            dataCategory {
              id
              name
              category
            }
            confidence
          }
          createdAt
        }
      }
    `;
    const data = await this.makeRequest<{ classificationScan: ClassificationScan }>(query, { id });
    return data.classificationScan;
  }

  async listDiscoveryPlugins(options?: ListOptions): Promise<PaginatedResponse<DiscoveryPlugin>> {
    const query = `
      query ListDataSiloTypes($first: Int) {
        dataSilos(first: $first) {
          nodes {
            id
            title
            type
            description
          }
          totalCount
        }
      }
    `;
    const data = await this.makeRequest<{
      dataSilos: {
        nodes: Array<{ id: string; title: string; type: string; description: string | null }>;
        totalCount: number;
      };
    }>(query, { first: options?.first || 50 });
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
      pageInfo: { hasNextPage: false, hasPreviousPage: false },
      totalCount: plugins.length,
    };
  }
}
