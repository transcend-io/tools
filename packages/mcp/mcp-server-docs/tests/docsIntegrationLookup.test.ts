import { describe, expect, it, vi } from 'vitest';

import { createDocsIntegrationLookupTool } from '../src/tools/docs_integration_lookup.js';
import { getDocsTools } from '../src/tools/index.js';

function buildMockClients() {
  return {
    graphql: {
      getCatalogIntegrationDetail: vi.fn(),
      listCatalogs: vi.fn(),
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

  it('searches the catalog when query is set', async () => {
    const clients = buildMockClients();
    clients.graphql.listCatalogs.mockResolvedValue({
      nodes: [{ integrationName: 'hubSpot', title: 'HubSpot', description: 'Marketing' }],
      totalCount: 1,
      pageInfo: { hasNextPage: false, hasPreviousPage: false },
    });

    const tool = createDocsIntegrationLookupTool(clients as never);
    const result = (await tool.handler({ query: 'hub' })) as {
      success: boolean;
      data: Array<{ integrationName: string; publicGuideUrl?: string }>;
      count: number;
    };

    expect(result.success).toBe(true);
    expect(result.count).toBe(1);
    expect(result.data[0]?.integrationName).toBe('hubSpot');
    expect(clients.graphql.listCatalogs).toHaveBeenCalledWith({
      first: 25,
      offset: 0,
      text: 'hub',
    });
  });
});
