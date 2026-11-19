import { TranscendGraphQLBase } from '@transcend-io/mcp-server-base';

export type CatalogDataPoint = {
  name: string;
  title: string;
  description: string;
  allowedActions: string[];
};

export type CatalogPlaintextRequirement = {
  path: string;
  types: string[];
};

export type CatalogIntegrationDetail = {
  integrationName: string;
  title: string;
  description: string;
  minimumSombraVersion: string;
  introMessageMarkdown?: string;
  businessUserOverviewMarkdown?: string;
  allowedActions: string[];
  dataPoints: CatalogDataPoint[];
  plaintextInformation: CatalogPlaintextRequirement[];
};

const CatalogDetailQuery = `
  query DocsIntegrationCatalog($input: CatalogInput!) {
    catalog(input: $input) {
      catalog {
        integrationName
        title
        description
        minimumSombraVersion
        introMessageMarkdown
        businessUserOverviewMarkdown
        allowedActions
        dataPoints {
          name
          title
          description
          allowedActions
        }
        plaintextInformation {
          path
          types
        }
      }
    }
  }
`;

const CatalogSearchQuery = `
  query DocsIntegrationCatalogSearch($first: Int, $filterBy: CatalogFiltersInput!) {
    catalogs(first: $first, filterBy: $filterBy) {
      nodes {
        integrationName
        title
      }
    }
  }
`;

/** A catalog row returned by {@link DocsCatalogMixin.searchCatalogIntegrations}. */
export type CatalogIntegrationName = {
  integrationName: string;
  title: string;
};

type RawCatalogSearchResponse = {
  catalogs: { nodes: CatalogIntegrationName[] };
};

type RawCatalogResponse = {
  catalog: {
    catalog: {
      integrationName: string;
      title: string;
      description: string;
      minimumSombraVersion: string;
      introMessageMarkdown?: string | null;
      businessUserOverviewMarkdown?: string | null;
      allowedActions: string[];
      dataPoints: CatalogDataPoint[];
      plaintextInformation: CatalogPlaintextRequirement[];
    };
  };
};

export class DocsCatalogMixin extends TranscendGraphQLBase {
  /** Searches catalog title and integrationName, returning names only. */
  async searchCatalogIntegrations(text: string, first: number): Promise<CatalogIntegrationName[]> {
    const data = await this.makeRequest<RawCatalogSearchResponse>(CatalogSearchQuery, {
      first,
      filterBy: { text },
    });
    return data.catalogs.nodes;
  }

  async getCatalogIntegrationDetail(integrationName: string): Promise<CatalogIntegrationDetail> {
    const data = await this.makeRequest<RawCatalogResponse>(CatalogDetailQuery, {
      input: { integrationName },
    });
    const catalog = data.catalog.catalog;
    return {
      integrationName: catalog.integrationName,
      title: catalog.title,
      description: catalog.description,
      minimumSombraVersion: catalog.minimumSombraVersion,
      introMessageMarkdown: catalog.introMessageMarkdown ?? undefined,
      businessUserOverviewMarkdown: catalog.businessUserOverviewMarkdown ?? undefined,
      allowedActions: catalog.allowedActions,
      dataPoints: catalog.dataPoints,
      plaintextInformation: catalog.plaintextInformation,
    };
  }
}

export type DocsCatalogGraphqlClient = TranscendGraphQLBase & {
  getCatalogIntegrationDetail: DocsCatalogMixin['getCatalogIntegrationDetail'];
  searchCatalogIntegrations: DocsCatalogMixin['searchCatalogIntegrations'];
};
