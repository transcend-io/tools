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

// The single-fetch operations (get/create/update) use the typed `graphql()`
// tag so drift fails at compile time. The `list*` methods below intentionally
// keep raw query strings because they route through `listConnection`, the
// shared offset-pagination engine in mcp-server-base that also powers the
// `all` (fetch-every-page) option.
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

function mapDataSilo<
  T extends {
    id: string;
    title: string;
    type: string;
    description?: string | null;
    isLive: boolean;
    createdAt: string;
  },
>(node: T): DataSilo {
  return {
    id: node.id,
    title: node.title,
    type: node.type as DataSiloType,
    description: node.description ?? undefined,
    isLive: node.isLive,
    createdAt: node.createdAt,
  };
}

export class InventoryMixin extends TranscendGraphQLBase {
  async listDataSilos(options?: ListOptions): Promise<PaginatedResponse<DataSilo>> {
    const query = `
      query ListDataSilos($first: Int, $offset: Int) {
        dataSilos(first: $first, offset: $offset) {
          nodes {
            id
            title
            type
            isLive
            outerType
            createdAt
          }
          totalCount
        }
      }
    `;
    return this.listConnection<DataSilo>(query, 'dataSilos', options);
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
    const query = `
      query ListVendors($first: Int, $offset: Int) {
        vendors(first: $first, offset: $offset) {
          nodes {
            id
            title
          }
          totalCount
        }
      }
    `;
    return this.listConnection<Vendor>(query, 'vendors', options);
  }

  async listDataPoints(
    _dataSiloId?: string,
    options?: ListOptions,
  ): Promise<PaginatedResponse<DataPoint>> {
    const query = `
      query ListDataPoints($first: Int, $offset: Int) {
        dataPoints(first: $first, offset: $offset) {
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
    type RawDataPoint = {
      id: string;
      name: string;
      title: { defaultMessage: string };
      description: { defaultMessage: string } | null;
    };
    const toDataPoint = (dp: RawDataPoint): DataPoint => ({
      id: dp.id,
      name: dp.name,
      title: dp.title?.defaultMessage,
      description: dp.description?.defaultMessage,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return this.listConnection<RawDataPoint, DataPoint>(query, 'dataPoints', options, {
      mapNode: toDataPoint,
    });
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
    return this.listConnection<SubDataPoint>(query, 'subDataPoints', options, {
      variables: { filterBy: { dataPoints: [dataPointId] } },
    });
  }

  async listIdentifiers(options?: ListOptions): Promise<PaginatedResponse<Identifier>> {
    const query = `
      query ListIdentifiers($first: Int, $offset: Int) {
        identifiers(first: $first, offset: $offset) {
          nodes {
            id
            name
            type
            isRequiredInForm
          }
          totalCount
        }
      }
    `;
    return this.listConnection<Identifier>(query, 'identifiers', options);
  }

  async listDataCategories(options?: ListOptions): Promise<PaginatedResponse<DataCategory>> {
    const query = `
      query ListDataCategories($first: Int, $offset: Int) {
        dataCategories(first: $first, offset: $offset) {
          nodes {
            name
            category
          }
          totalCount
        }
      }
    `;
    return this.listConnection<DataCategory>(query, 'dataCategories', options);
  }
}
