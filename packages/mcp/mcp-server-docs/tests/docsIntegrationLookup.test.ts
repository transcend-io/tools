import { describe, expect, it, vi } from 'vitest';

import { createDocsIntegrationLookupTool } from '../src/tools/docs_integration_lookup.js';
import { getDocsTools } from '../src/tools/index.js';

function buildMockClients() {
  return {
    graphql: {
      getCatalogIntegrationDetail: vi.fn(),
      searchCatalogIntegrations: vi.fn(),
    },
    rest: {} as never,
    dashboardUrl: 'https://app.transcend.io',
  };
}

describe('getDocsTools', () => {
  it('registers docs_integration_lookup with auth required', () => {
    const tools = getDocsTools(buildMockClients() as never);
    expect(tools.map((tool) => tool.name)).toEqual([
      'docs_list',
      'docs_fetch',
      'docs_integration_lookup',
    ]);
    const lookup = tools.find((tool) => tool.name === 'docs_integration_lookup');
    expect(lookup?.requireAuth).toBe(true);
    expect(lookup?.readOnly).toBe(true);
    expect(tools.filter((tool) => tool.requireAuth === false).map((tool) => tool.name)).toEqual([
      'docs_list',
      'docs_fetch',
    ]);
  });
});

describe('docs_integration_lookup', () => {
  it('returns catalog markdown for one integration', async () => {
    const clients = buildMockClients();
    clients.graphql.getCatalogIntegrationDetail.mockResolvedValue({
      integrationName: 'salesforce',
      title: 'Salesforce',
      description: 'CRM',
      minimumSombraVersion: '1.2.3',
      businessUserOverviewMarkdown: 'Overview text',
      introMessageMarkdown: 'Connect steps',
      allowedActions: ['ACCESS'],
      dataPoints: [
        {
          name: 'email',
          title: 'Email',
          description: 'Email field',
          allowedActions: ['ERASE'],
        },
      ],
      plaintextInformation: [],
    });

    const tool = createDocsIntegrationLookupTool(clients as never);
    const result = (await tool.handler({ integration: 'salesforce' })) as {
      success: boolean;
      data: { markdown: string; publicGuideUrl?: string };
    };

    expect(result.success).toBe(true);
    expect(result.data.markdown).toContain('Connect steps');
    expect(result.data.markdown).toContain('salesforce');
    expect(result.data.publicGuideUrl).toContain('/docs/integrations/salesforce');
    expect(clients.graphql.getCatalogIntegrationDetail).toHaveBeenCalledWith('salesforce');
  });

  it('rejects a call without an integration', () => {
    const tool = createDocsIntegrationLookupTool(buildMockClients() as never);
    expect(tool.zodSchema.safeParse({}).success).toBe(false);
    expect(tool.zodSchema.safeParse({ integration: '  ' }).success).toBe(false);
    expect(tool.zodSchema.safeParse({ query: 'hub' }).success).toBe(false);
  });

  it('resolves a title to its integrationName when the exact name is not found', async () => {
    const clients = buildMockClients();
    clients.graphql.getCatalogIntegrationDetail
      .mockRejectedValueOnce(new Error('not found'))
      .mockResolvedValueOnce({
        integrationName: 'hubSpot',
        title: 'HubSpot',
        description: 'Marketing',
        minimumSombraVersion: '1.0.0',
        allowedActions: [],
        dataPoints: [],
        plaintextInformation: [],
      });
    clients.graphql.searchCatalogIntegrations.mockResolvedValue([
      { integrationName: 'hubSpot', title: 'HubSpot' },
    ]);

    const tool = createDocsIntegrationLookupTool(clients as never);
    const result = (await tool.handler({ integration: 'hubspot' })) as {
      data: { integrationName: string };
    };

    expect(result.data.integrationName).toBe('hubSpot');
    expect(clients.graphql.getCatalogIntegrationDetail).toHaveBeenLastCalledWith('hubSpot');
  });

  it('names close integrations when nothing matches exactly', async () => {
    const clients = buildMockClients();
    clients.graphql.getCatalogIntegrationDetail.mockRejectedValue(new Error('not found'));
    clients.graphql.searchCatalogIntegrations.mockResolvedValue([
      { integrationName: 'amazonS3', title: 'Amazon S3' },
      { integrationName: 'amazonDynamodb', title: 'Amazon DynamoDB' },
    ]);

    const tool = createDocsIntegrationLookupTool(clients as never);
    await expect(tool.handler({ integration: 'amazon' })).rejects.toThrow(
      /Close names: amazonS3, amazonDynamodb/,
    );
  });

  it('keeps the original error when the catalog search finds nothing', async () => {
    const clients = buildMockClients();
    clients.graphql.getCatalogIntegrationDetail.mockRejectedValue(new Error('Forbidden'));
    clients.graphql.searchCatalogIntegrations.mockResolvedValue([]);

    const tool = createDocsIntegrationLookupTool(clients as never);
    await expect(tool.handler({ integration: 'salesforce' })).rejects.toThrow('Forbidden');
  });
});
