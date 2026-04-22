import {
  TranscendGraphQLBase,
  type DataCategory,
  type DataPoint,
  type DataSilo,
  type DataSiloCreateInput,
  type DataSiloDetails,
  type DataSiloUpdateInput,
  type Identifier,
  type ListOptions,
  type PaginatedResponse,
  type SubDataPoint,
  type Vendor,
} from '@transcend-io/mcp-server-base';

export class InventoryMixin extends TranscendGraphQLBase {
  async listDataSilos(options?: ListOptions): Promise<PaginatedResponse<DataSilo>> {
    const query = `
      query ListDataSilos($first: Int) {
        dataSilos(first: $first) {
          nodes {
            id
            title
            type
          }
          totalCount
        }
      }
    `;
    const data = await this.makeRequest<{ dataSilos: { nodes: DataSilo[]; totalCount: number } }>(
      query,
      { first: Math.min(options?.first || 100, 100) },
    );
    return {
      nodes: data.dataSilos.nodes,
      pageInfo: {
        hasNextPage: data.dataSilos.nodes.length < data.dataSilos.totalCount,
        hasPreviousPage: false,
      },
      totalCount: data.dataSilos.totalCount,
    };
  }

  async getDataSilo(id: string): Promise<DataSiloDetails> {
    const query = `
      query GetDataSilo($id: String!) {
        dataSilo(id: $id) {
          id
          title
          type
          description
          link
          isLive
          outerType
          createdAt
          connectionState
          identifiers {
            id
            name
            type
            isRequiredInForm
          }
        }
      }
    `;
    const data = await this.makeRequest<{ dataSilo: DataSiloDetails }>(query, { id });
    return data.dataSilo;
  }

  async createDataSilo(input: DataSiloCreateInput): Promise<DataSilo> {
    const mutation = `
      mutation CreateDataSilos($input: [CreateDataSilosInput!]!) {
        createDataSilos(input: $input) {
          dataSilos {
            id
            title
            type
            description
            isLive
            createdAt
          }
        }
      }
    `;
    const data = await this.makeRequest<{ createDataSilos: { dataSilos: DataSilo[] } }>(mutation, {
      input: [input],
    });
    const created = data.createDataSilos.dataSilos[0];
    if (!created) throw new Error('createDataSilos returned an empty array');
    return created;
  }

  async updateDataSilo(input: DataSiloUpdateInput): Promise<DataSilo> {
    const mutation = `
      mutation UpdateDataSilos($input: UpdateDataSilosInput!) {
        updateDataSilos(input: $input) {
          dataSilos {
            id
            title
            type
            description
            isLive
            createdAt
            updatedAt
          }
        }
      }
    `;
    const wrappedInput = { dataSilos: [input] };
    const data = await this.makeRequest<{ updateDataSilos: { dataSilos: DataSilo[] } }>(mutation, {
      input: wrappedInput,
    });
    const updated = data.updateDataSilos.dataSilos[0];
    if (!updated) throw new Error('updateDataSilos returned an empty array');
    return updated;
  }

  async listVendors(options?: ListOptions): Promise<PaginatedResponse<Vendor>> {
    const query = `
      query ListVendors($first: Int) {
        vendors(first: $first) {
          nodes {
            id
            title
          }
          totalCount
        }
      }
    `;
    const data = await this.makeRequest<{ vendors: { nodes: Vendor[]; totalCount: number } }>(
      query,
      { first: Math.min(options?.first || 100, 100) },
    );
    return {
      nodes: data.vendors.nodes,
      pageInfo: {
        hasNextPage: data.vendors.nodes.length < data.vendors.totalCount,
        hasPreviousPage: false,
      },
      totalCount: data.vendors.totalCount,
    };
  }

  async listDataPoints(
    _dataSiloId?: string,
    options?: ListOptions,
  ): Promise<PaginatedResponse<DataPoint>> {
    const query = `
      query ListDataPoints($first: Int) {
        dataPoints(first: $first) {
          nodes {
            id
            name
            title {
              defaultMessage
            }
            description {
              defaultMessage
            }
          }
          totalCount
        }
      }
    `;
    const data = await this.makeRequest<{
      dataPoints: {
        nodes: Array<{
          id: string;
          name: string;
          title: { defaultMessage: string };
          description: { defaultMessage: string } | null;
        }>;
        totalCount: number;
      };
    }>(query, { first: Math.min(options?.first || 100, 100) });
    const points: DataPoint[] = data.dataPoints.nodes.map((dp) => ({
      id: dp.id,
      name: dp.name,
      title: dp.title?.defaultMessage,
      description: dp.description?.defaultMessage,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    return {
      nodes: points,
      pageInfo: { hasNextPage: points.length < data.dataPoints.totalCount, hasPreviousPage: false },
      totalCount: data.dataPoints.totalCount,
    };
  }

  async listSubDataPoints(
    dataPointId: string,
    options?: ListOptions,
  ): Promise<PaginatedResponse<SubDataPoint>> {
    const query = `
      query ListSubDataPoints($first: Int, $offset: Int, $filterBy: SubDataPointFiltersInput) {
        subDataPoints(first: $first, offset: $offset, filterBy: $filterBy) {
          nodes {
            id
            name
            description
            accessRequestVisibilityEnabled
          }
          totalCount
        }
      }
    `;
    const data = await this.makeRequest<{
      subDataPoints: { nodes: SubDataPoint[]; totalCount: number };
    }>(query, {
      first: Math.min(options?.first || 100, 100),
      offset: options?.offset || 0,
      filterBy: { dataPoints: [dataPointId] },
    });
    return {
      nodes: data.subDataPoints.nodes,
      pageInfo: {
        hasNextPage: data.subDataPoints.nodes.length < data.subDataPoints.totalCount,
        hasPreviousPage: false,
      },
      totalCount: data.subDataPoints.totalCount,
    };
  }

  async listIdentifiers(options?: ListOptions): Promise<PaginatedResponse<Identifier>> {
    const query = `
      query ListIdentifiers($first: Int) {
        identifiers(first: $first) {
          nodes {
            id
            name
            type
          }
          totalCount
        }
      }
    `;
    const data = await this.makeRequest<{
      identifiers: { nodes: Identifier[]; totalCount: number };
    }>(query, { first: Math.min(options?.first || 100, 100) });
    return {
      nodes: data.identifiers.nodes,
      pageInfo: {
        hasNextPage: data.identifiers.nodes.length < data.identifiers.totalCount,
        hasPreviousPage: false,
      },
      totalCount: data.identifiers.totalCount,
    };
  }

  async listDataCategories(options?: ListOptions): Promise<PaginatedResponse<DataCategory>> {
    const query = `
      query ListDataCategories($first: Int) {
        dataCategories(first: $first) {
          nodes {
            name
            category
          }
          totalCount
        }
      }
    `;
    const data = await this.makeRequest<{
      dataCategories: { nodes: DataCategory[]; totalCount: number };
    }>(query, { first: Math.min(options?.first || 100, 100) });
    return {
      nodes: data.dataCategories.nodes,
      pageInfo: {
        hasNextPage: data.dataCategories.nodes.length < data.dataCategories.totalCount,
        hasPreviousPage: false,
      },
      totalCount: data.dataCategories.totalCount,
    };
  }
}
