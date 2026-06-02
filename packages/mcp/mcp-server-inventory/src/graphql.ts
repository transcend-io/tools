import {
  TranscendGraphQLBase,
  type DataCategory,
  type DataPoint,
  type DataSilo,
  type DataSiloCreateInput,
  type DataSiloDetails,
  type DataSiloType,
  type DataSiloUpdateInput,
  type Identifier,
  type ListOptions,
  type PaginatedResponse,
  type SubDataPoint,
  type Vendor,
} from '@transcend-io/mcp-server-base';

import { graphql } from './__generated__/gql.js';

const ListDataSilosDoc = graphql(/* GraphQL */ `
  query InventoryListDataSilos($first: Int) {
    dataSilos(first: $first) {
      nodes {
        id
        title
        type
      }
      totalCount
    }
  }
`);

const GetDataSiloDoc = graphql(/* GraphQL */ `
  query InventoryGetDataSilo($id: String!) {
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
`);

const CreateDataSilosDoc = graphql(/* GraphQL */ `
  mutation InventoryCreateDataSilos($input: [CreateDataSilosInput!]!) {
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
`);

// `DataSilo.updatedAt` does not exist in the schema (only `createdAt` and
// `deletedAt`). The previous selection requested it and would have errored
// at runtime if Transcend's API used strict validation.
const UpdateDataSilosDoc = graphql(/* GraphQL */ `
  mutation InventoryUpdateDataSilos($input: UpdateDataSilosInput!) {
    updateDataSilos(input: $input) {
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
`);

const ListVendorsDoc = graphql(/* GraphQL */ `
  query InventoryListVendors($first: Int) {
    vendors(first: $first) {
      nodes {
        id
        title
      }
      totalCount
    }
  }
`);

const ListDataPointsDoc = graphql(/* GraphQL */ `
  query InventoryListDataPoints($first: Int) {
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
`);

const ListSubDataPointsDoc = graphql(/* GraphQL */ `
  query InventoryListSubDataPoints($first: Int, $offset: Int, $filterBy: SubDataPointFiltersInput) {
    subDataPoints(first: $first, offset: $offset, filterBy: $filterBy) {
      nodes {
        id
        name
        description
      }
      totalCount
    }
  }
`);

const ListIdentifiersDoc = graphql(/* GraphQL */ `
  query InventoryListIdentifiers($first: Int) {
    identifiers(first: $first) {
      nodes {
        id
        name
        type
      }
      totalCount
    }
  }
`);

const ListDataCategoriesDoc = graphql(/* GraphQL */ `
  query InventoryListDataCategories($first: Int) {
    dataCategories(first: $first) {
      nodes {
        name
        category
      }
      totalCount
    }
  }
`);

function mapDataSilo<
  T extends { id: string; title: string; type: string; description?: string | null },
>(node: T): DataSilo {
  return {
    id: node.id,
    title: node.title,
    type: node.type as DataSiloType,
    description: node.description ?? undefined,
    isLive: false,
    createdAt: '',
  };
}

export class InventoryMixin extends TranscendGraphQLBase {
  async listDataSilos(options?: ListOptions): Promise<PaginatedResponse<DataSilo>> {
    const data = await this.makeRequest(ListDataSilosDoc, {
      first: Math.min(options?.first ?? 100, 100),
    });
    return {
      nodes: data.dataSilos.nodes.map((node) => ({
        id: node.id,
        title: node.title,
        type: node.type as DataSiloType,
        isLive: false,
        createdAt: '',
      })),
      pageInfo: {
        hasNextPage: data.dataSilos.nodes.length < data.dataSilos.totalCount,
        hasPreviousPage: false,
      },
      totalCount: data.dataSilos.totalCount,
    };
  }

  async getDataSilo(id: string): Promise<DataSiloDetails> {
    const data = await this.makeRequest(GetDataSiloDoc, { id });
    const silo = data.dataSilo;
    return {
      id: silo.id,
      title: silo.title,
      type: silo.type as DataSiloType,
      description: silo.description ?? undefined,
      link: silo.link ?? undefined,
      isLive: silo.isLive,
      outerType: silo.outerType ?? undefined,
      createdAt: silo.createdAt,
      identifiers: silo.identifiers?.map((idf) => ({
        id: idf.id,
        name: idf.name,
        type: idf.type,
        isRequiredInForm: idf.isRequiredInForm ?? undefined,
      })),
    };
  }

  async createDataSilo(input: DataSiloCreateInput): Promise<DataSilo> {
    const data = await this.makeRequest(CreateDataSilosDoc, { input: [input as never] });
    const created = data.createDataSilos.dataSilos[0];
    if (!created) throw new Error('createDataSilos returned an empty array');
    return mapDataSilo(created);
  }

  async updateDataSilo(input: DataSiloUpdateInput): Promise<DataSilo> {
    const data = await this.makeRequest(UpdateDataSilosDoc, {
      input: { dataSilos: [input as never] },
    });
    const updated = data.updateDataSilos.dataSilos[0];
    if (!updated) throw new Error('updateDataSilos returned an empty array');
    return mapDataSilo(updated);
  }

  async listVendors(options?: ListOptions): Promise<PaginatedResponse<Vendor>> {
    const data = await this.makeRequest(ListVendorsDoc, {
      first: Math.min(options?.first ?? 100, 100),
    });
    return {
      nodes: data.vendors.nodes.map((v) => ({
        id: v.id,
        title: v.title,
        createdAt: '',
      })),
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
    const data = await this.makeRequest(ListDataPointsDoc, {
      first: Math.min(options?.first ?? 100, 100),
    });
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
    const data = await this.makeRequest(ListSubDataPointsDoc, {
      first: Math.min(options?.first ?? 100, 100),
      offset: options?.offset ?? 0,
      filterBy: { dataPoints: [dataPointId] },
    });
    return {
      nodes: data.subDataPoints.nodes.map((node) => ({
        id: node.id,
        name: node.name,
        description: node.description ?? undefined,
      })),
      pageInfo: {
        hasNextPage: data.subDataPoints.nodes.length < data.subDataPoints.totalCount,
        hasPreviousPage: false,
      },
      totalCount: data.subDataPoints.totalCount,
    };
  }

  async listIdentifiers(options?: ListOptions): Promise<PaginatedResponse<Identifier>> {
    const data = await this.makeRequest(ListIdentifiersDoc, {
      first: Math.min(options?.first ?? 100, 100),
    });
    return {
      nodes: data.identifiers.nodes.map((idf) => ({
        id: idf.id,
        name: idf.name,
        type: idf.type,
      })),
      pageInfo: {
        hasNextPage: data.identifiers.nodes.length < data.identifiers.totalCount,
        hasPreviousPage: false,
      },
      totalCount: data.identifiers.totalCount,
    };
  }

  async listDataCategories(options?: ListOptions): Promise<PaginatedResponse<DataCategory>> {
    const data = await this.makeRequest(ListDataCategoriesDoc, {
      first: Math.min(options?.first ?? 100, 100),
    });
    return {
      nodes: data.dataCategories.nodes.map((cat) => ({
        // The dataCategories list endpoint doesn't expose a stable id; use
        // category::name as a synthetic key. Codegen now flags drift here
        // -- if Transcend ever surfaces a real `id`, update the selection.
        id: `${cat.category}::${cat.name ?? ''}`,
        name: cat.name ?? '',
        category: cat.category as string,
      })),
      pageInfo: {
        hasNextPage: data.dataCategories.nodes.length < data.dataCategories.totalCount,
        hasPreviousPage: false,
      },
      totalCount: data.dataCategories.totalCount,
    };
  }
}
