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
  listCatalogs?: (
    options?: import('@transcend-io/mcp-server-base').ListOptions & { text?: string },
  ) => Promise<
    import('@transcend-io/mcp-server-base').PaginatedResponse<{
      integrationName: string;
      title: string;
      description?: string;
    }>
  >;
};
