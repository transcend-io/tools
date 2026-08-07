import {
  TranscendGraphQLBase,
  type BusinessEntity,
  type DataCategory,
  type DataPoint,
  type DataPointUpdateOrCreateInput,
  type DataPurpose,
  type DataSilo,
  type DataSiloCreateInput,
  type DataSiloDetails,
  type DataSiloType,
  type DataSiloUpdateInput,
  type DataSubject,
  type Identifier,
  type ListOptions,
  type PaginatedResponse,
  type SubDataPoint,
  type Vendor,
  type ProcessingPurposeCreateInput,
  type ProcessingPurposeUpdateInput,
  type ProcessingPurposeWriteInput,
  type VendorCreateInput,
  type VendorUpdateInput,
  type VendorWriteInput,
} from '@transcend-io/mcp-server-base';
import { DefaultPurposeSubCategoryType } from '@transcend-io/privacy-types';

import { graphql } from './__generated__/gql.js';

/**
 * Normalize empty / whitespace subcategory names to
 * {@link DefaultPurposeSubCategoryType.Other} so read keys match write-tool defaults.
 */
function normalizeSubCategoryName(name: string | null | undefined): string {
  return name && name.trim() ? name : DefaultPurposeSubCategoryType.Other;
}

function mapDataPurpose(node: {
  id: string;
  name: string;
  purpose: string;
  description?: string | null;
}): DataPurpose {
  return {
    id: node.id,
    name: normalizeSubCategoryName(node.name),
    purpose: node.purpose,
    description: node.description ?? undefined,
  };
}

function mapDataCategory(node: {
  id?: string | null;
  name: string | null;
  category: string;
  description?: string | null;
}): DataCategory {
  return {
    id: node.id ?? '',
    name: normalizeSubCategoryName(node.name),
    category: node.category,
    description: node.description ?? undefined,
  };
}

function mapDataSubject(node: {
  id: string;
  type: string;
  active?: boolean | null;
  title?: { defaultMessage: string } | string | null;
}): DataSubject {
  const title =
    typeof node.title === 'string' ? node.title : (node.title?.defaultMessage ?? undefined);
  return {
    id: node.id,
    type: node.type,
    title,
    active: node.active ?? undefined,
  };
}

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
      notes
      contactName
      contactEmail
      websiteUrl
      country
      countrySubDivision
      vendor {
        id
        title
        description
        contactName
        contactEmail
        websiteUrl
        dataProcessingAgreementLink
      }
      processingPurposeSubCategories {
        id
        name
        purpose
        description
      }
      owners {
        id
        email
        name
      }
      teams {
        id
        name
      }
      businessEntities {
        id
        title
        description
      }
      subjects {
        id
        type
        title {
          defaultMessage
        }
      }
      subjectBlocklist {
        id
        type
        title {
          defaultMessage
        }
      }
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

const UpdateOrCreateDataPointDoc = graphql(/* GraphQL */ `
  mutation InventoryUpdateOrCreateDataPoint($input: UpdateOrCreateDataPointInput!) {
    updateOrCreateDataPoint(input: $input) {
      dataPoint {
        id
        name
      }
    }
  }
`);

const CreateProcessingPurposeSubCategoryDoc = graphql(/* GraphQL */ `
  mutation InventoryCreateProcessingPurposeSubCategory(
    $input: CreateProcessingPurposeCategoryInput!
  ) {
    createProcessingPurposeSubCategory(input: $input) {
      processingPurposeSubCategory {
        id
        name
        purpose
        description
      }
    }
  }
`);

const UpdateProcessingPurposeSubCategoriesDoc = graphql(/* GraphQL */ `
  mutation InventoryUpdateProcessingPurposeSubCategories(
    $input: UpdateProcessingPurposeSubCategoriesInput!
  ) {
    updateProcessingPurposeSubCategories(input: $input) {
      processingPurposeSubCategories {
        id
        name
        purpose
        description
      }
    }
  }
`);

const CreateVendorDoc = graphql(/* GraphQL */ `
  mutation InventoryCreateVendor($input: CreateVendorInput!) {
    createVendor(input: $input) {
      vendor {
        id
        title
        description
        dataProcessingAgreementLink
        contactName
        contactEmail
        contactPhone
        websiteUrl
        address
        headquarterCountry
        headquarterSubDivision
        createdAt
      }
    }
  }
`);

const UpdateVendorsDoc = graphql(/* GraphQL */ `
  mutation InventoryUpdateVendors($input: UpdateVendorsInput!) {
    updateVendors(input: $input) {
      vendors {
        id
        title
        description
        dataProcessingAgreementLink
        contactName
        contactEmail
        contactPhone
        websiteUrl
        address
        headquarterCountry
        headquarterSubDivision
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

function mapVendorPreview<
  T extends {
    id: string;
    title: string;
    description?: string | null;
    dataProcessingAgreementLink?: string | null;
    contactName?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    websiteUrl?: string | null;
    address?: string | null;
    headquarterCountry?: string | null;
    headquarterSubDivision?: string | null;
    createdAt?: string | null;
  },
>(node: T): Vendor {
  return {
    id: node.id,
    title: node.title,
    description: node.description ?? undefined,
    dataProcessingAgreementLink: node.dataProcessingAgreementLink ?? undefined,
    contactName: node.contactName ?? undefined,
    contactEmail: node.contactEmail ?? undefined,
    contactPhone: node.contactPhone ?? undefined,
    websiteUrl: node.websiteUrl ?? undefined,
    address: node.address ?? undefined,
    headquarterCountry: node.headquarterCountry ?? undefined,
    headquarterSubDivision: node.headquarterSubDivision ?? undefined,
    createdAt: node.createdAt ?? new Date().toISOString(),
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
      notes: silo.notes ?? undefined,
      contactName: silo.contactName ?? undefined,
      contactEmail: silo.contactEmail ?? undefined,
      websiteUrl: silo.websiteUrl ?? undefined,
      country: silo.country ?? undefined,
      countrySubDivision: silo.countrySubDivision ?? undefined,
      vendor: silo.vendor
        ? {
            id: silo.vendor.id,
            title: silo.vendor.title,
            description: silo.vendor.description ?? undefined,
            contactName: silo.vendor.contactName ?? undefined,
            contactEmail: silo.vendor.contactEmail ?? undefined,
            websiteUrl: silo.vendor.websiteUrl ?? undefined,
            dataProcessingAgreementLink: silo.vendor.dataProcessingAgreementLink ?? undefined,
          }
        : undefined,
      processingPurposeSubCategories: silo.processingPurposeSubCategories?.map(mapDataPurpose),
      owners: silo.owners?.map((owner) => ({
        id: owner.id,
        email: owner.email,
        name: owner.name ?? undefined,
      })),
      teams: silo.teams?.map((team) => ({
        id: team.id,
        name: team.name,
      })),
      businessEntities: silo.businessEntities?.map((entity) => ({
        id: entity.id,
        title: entity.title,
        description: entity.description ?? undefined,
      })),
      subjects: silo.subjects?.map(mapDataSubject),
      subjectBlocklist: silo.subjectBlocklist?.map(mapDataSubject),
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
            description
            dataProcessingAgreementLink
            contactName
            contactEmail
            contactPhone
            websiteUrl
            address
            headquarterCountry
            headquarterSubDivision
            createdAt
          }
          totalCount
        }
      }
    `;
    type RawVendor = {
      id: string;
      title: string;
      description: string | null;
      dataProcessingAgreementLink: string | null;
      contactName: string | null;
      contactEmail: string | null;
      contactPhone: string | null;
      websiteUrl: string | null;
      address: string | null;
      headquarterCountry: string | null;
      headquarterSubDivision: string | null;
      createdAt: string;
    };
    return this.listConnection<RawVendor, Vendor>(query, 'vendors', options, {
      mapNode: mapVendorPreview,
    });
  }

  async createVendor(input: VendorCreateInput): Promise<Vendor> {
    const data = await this.makeRequest(CreateVendorDoc, { input: input as never });
    return mapVendorPreview(data.createVendor.vendor);
  }

  async updateVendor(input: VendorUpdateInput): Promise<Vendor> {
    const data = await this.makeRequest(UpdateVendorsDoc, {
      input: { vendors: [input as never] },
    });
    const updated = data.updateVendors.vendors[0];
    if (!updated) throw new Error('updateVendors returned an empty array');
    return mapVendorPreview(updated);
  }

  /**
   * Upsert a vendor: update by id when provided, otherwise look up by title
   * and create if missing (CLI sync semantics).
   */
  async writeVendor(input: VendorWriteInput): Promise<{
    /** Written vendor */
    vendor: Vendor;
    /** True when a new vendor was created */
    created: boolean;
  }> {
    const fields = {
      title: input.title,
      description: input.description,
      dataProcessingAgreementLink: input.dataProcessingAgreementLink,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      websiteUrl: input.websiteUrl,
      address: input.address,
      headquarterCountry: input.headquarterCountry,
      headquarterSubDivision: input.headquarterSubDivision,
    };

    if (input.id) {
      const vendor = await this.updateVendor({ id: input.id, ...fields });
      return { vendor, created: false };
    }

    if (!input.title) {
      throw new Error('writeVendor requires `id` or `title`');
    }

    const existing = await this.listVendors({ all: true });
    const match = existing.nodes.find((v) => v.title === input.title);
    if (match) {
      const vendor = await this.updateVendor({ id: match.id, ...fields });
      return { vendor, created: false };
    }

    const vendor = await this.createVendor({
      title: input.title,
      description: input.description ?? '',
      dataProcessingAgreementLink: input.dataProcessingAgreementLink,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      websiteUrl: input.websiteUrl,
      address: input.address,
      headquarterCountry: input.headquarterCountry,
      headquarterSubDivision: input.headquarterSubDivision,
    });
    return { vendor, created: true };
  }

  async listDataPoints(
    dataSiloId?: string,
    options?: ListOptions,
  ): Promise<PaginatedResponse<DataPoint>> {
    const query = `
      query ListDataPoints($first: Int, $offset: Int, $filterBy: DataPointFiltersInput) {
        dataPoints(first: $first, offset: $offset, filterBy: $filterBy) {
          nodes {
            id
            name
            dataSiloId
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
      dataSiloId: string;
      title: { defaultMessage: string };
      description: { defaultMessage: string } | null;
    };
    const toDataPoint = (dp: RawDataPoint): DataPoint => ({
      id: dp.id,
      name: dp.name,
      dataSiloId: dp.dataSiloId,
      title: dp.title?.defaultMessage,
      description: dp.description?.defaultMessage,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return this.listConnection<RawDataPoint, DataPoint>(query, 'dataPoints', options, {
      variables: dataSiloId ? { filterBy: { dataSilos: [dataSiloId] } } : {},
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
            categories {
              id
              name
              category
            }
            purposes {
              id
              name
              purpose
              description
            }
          }
          totalCount
        }
      }
    `;
    type RawSubDataPoint = {
      id: string;
      name: string;
      description: string | null;
      accessRequestVisibilityEnabled: boolean;
      categories: { id: string; name: string | null; category: string }[];
      purposes: {
        id: string;
        name: string;
        purpose: string;
        description: string;
      }[];
    };
    return this.listConnection<RawSubDataPoint, SubDataPoint>(query, 'subDataPoints', options, {
      variables: { filterBy: { dataPoints: [dataPointId] } },
      mapNode: (node): SubDataPoint => ({
        id: node.id,
        name: node.name,
        description: node.description ?? undefined,
        accessRequestVisibilityEnabled: node.accessRequestVisibilityEnabled,
        categories: node.categories.map(mapDataCategory),
        purposes: node.purposes.map(mapDataPurpose),
      }),
    });
  }

  async listBusinessEntities(options?: ListOptions): Promise<PaginatedResponse<BusinessEntity>> {
    const query = `
      query ListBusinessEntities($first: Int, $offset: Int) {
        businessEntities(first: $first, offset: $offset) {
          nodes {
            id
            title
            description
          }
          totalCount
        }
      }
    `;
    type RawEntity = {
      id: string;
      title: string;
      description: string | null;
    };
    return this.listConnection<RawEntity, BusinessEntity>(query, 'businessEntities', options, {
      mapNode: (node): BusinessEntity => ({
        id: node.id,
        title: node.title,
        description: node.description ?? undefined,
      }),
    });
  }

  /**
   * List org data subject types. Not offset-paginated at the GraphQL layer —
   * returns the full `internalSubjects` set in one request.
   */
  async listDataSubjects(): Promise<PaginatedResponse<DataSubject>> {
    const query = `
      query ListDataSubjects {
        internalSubjects {
          id
          type
          active
          title {
            defaultMessage
          }
        }
      }
    `;
    type RawSubject = {
      id: string;
      type: string;
      active: boolean;
      title: { defaultMessage: string } | null;
    };
    const data = await this.makeRequest<{ internalSubjects: RawSubject[] }>(query);
    const nodes = data.internalSubjects.map(mapDataSubject);
    return {
      nodes,
      totalCount: nodes.length,
      pageInfo: { hasNextPage: false, hasPreviousPage: false },
    };
  }

  async updateOrCreateDataPoint(
    input: DataPointUpdateOrCreateInput,
  ): Promise<{ id: string; name: string }> {
    const data = await this.makeRequest(UpdateOrCreateDataPointDoc, {
      input: input as never,
    });
    return data.updateOrCreateDataPoint.dataPoint;
  }

  async listProcessingPurposes(options?: ListOptions): Promise<PaginatedResponse<DataPurpose>> {
    const query = `
      query ListProcessingPurposes($first: Int, $offset: Int) {
        processingPurposeSubCategories(first: $first, offset: $offset) {
          nodes {
            id
            name
            purpose
            description
          }
          totalCount
        }
      }
    `;
    type RawPurpose = {
      id: string;
      name: string;
      purpose: string;
      description: string;
    };
    return this.listConnection<RawPurpose, DataPurpose>(
      query,
      'processingPurposeSubCategories',
      options,
      {
        mapNode: mapDataPurpose,
      },
    );
  }

  async createProcessingPurpose(input: ProcessingPurposeCreateInput): Promise<DataPurpose> {
    const data = await this.makeRequest(CreateProcessingPurposeSubCategoryDoc, {
      input: input as never,
    });
    const created = data.createProcessingPurposeSubCategory.processingPurposeSubCategory;
    return mapDataPurpose(created);
  }

  async updateProcessingPurpose(input: ProcessingPurposeUpdateInput): Promise<DataPurpose> {
    const data = await this.makeRequest(UpdateProcessingPurposeSubCategoriesDoc, {
      input: { processingPurposeSubCategories: [input as never] },
    });
    const updated = data.updateProcessingPurposeSubCategories.processingPurposeSubCategories[0];
    if (!updated) {
      throw new Error('updateProcessingPurposeSubCategories returned an empty array');
    }
    return mapDataPurpose(updated);
  }

  /**
   * Upsert a processing purpose subcategory: update by id when provided,
   * otherwise look up by `name:purpose` and create if missing (CLI sync semantics).
   * Empty API names are treated as {@link DefaultPurposeSubCategoryType.Other} when matching.
   */
  async writeProcessingPurpose(input: ProcessingPurposeWriteInput): Promise<{
    /** Written processing purpose */
    processingPurpose: DataPurpose;
    /** True when a new subcategory was created */
    created: boolean;
  }> {
    if (input.id) {
      const processingPurpose = await this.updateProcessingPurpose({
        id: input.id,
        name: input.name,
        purpose: input.purpose,
        description: input.description,
      });
      return { processingPurpose, created: false };
    }

    if (!input.name || !input.purpose) {
      throw new Error('writeProcessingPurpose requires `id`, or both `name` and `purpose`');
    }

    const wantedName = normalizeSubCategoryName(input.name);
    const existing = await this.listProcessingPurposes({ all: true });
    const match = existing.nodes.find(
      (p) => normalizeSubCategoryName(p.name) === wantedName && p.purpose === input.purpose,
    );
    if (match) {
      const processingPurpose = await this.updateProcessingPurpose({
        id: match.id,
        name: input.name,
        purpose: input.purpose,
        description: input.description,
      });
      return { processingPurpose, created: false };
    }

    const processingPurpose = await this.createProcessingPurpose({
      name: input.name,
      purpose: input.purpose,
      description: input.description,
    });
    return { processingPurpose, created: true };
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
