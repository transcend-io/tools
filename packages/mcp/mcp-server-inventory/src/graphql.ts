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
      query ListDataSilos($first: Int, $offset: Int) {
        dataSilos(first: $first, offset: $offset) {
          nodes {
            id
            title
            type
            isLive
            outerType
          }
          totalCount
        }
      }
    `;
    return this.listConnection<DataSilo>(query, 'dataSilos', options);
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
