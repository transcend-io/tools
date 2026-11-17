import type { ToolClients } from '@transcend-io/mcp-server-base';
import { describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({ fetch: vi.fn() }));

vi.mock('@transcend-io/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@transcend-io/sdk')>()),
  fetchAllSiloDiscoveryResults: sdk.fetch,
}));

vi.mock('@transcend-io/mcp-server-base', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@transcend-io/mcp-server-base')>()),
  createGraphqlRequestClient: () => ({ marker: 'client' }),
}));

const { getDiscoveryTools } = await import('../src/index.js');

const clients = {
  rest: {} as never,
  graphql: {} as never,
  dashboardUrl: 'https://app.transcend.io',
} satisfies ToolClients;

const result = (n: number) => ({
  title: `Result ${n}`,
  resourceId: `arn:${n}`,
  suggestedCatalog: { title: 'Amazon Aurora' },
  plugin: { dataSilo: { title: 'AWS' } },
  country: 'IE',
  plaintextContext: '{"secret":"value"}',
  containsSensitiveData: 'LIKELY',
  status: 'IGNORED',
});

describe('discovery_list_system_discovery', () => {
  it('returns compact rows without the plaintext context', async () => {
    sdk.fetch.mockResolvedValue([result(1), result(2)]);
    const tool = getDiscoveryTools(clients).find(
      (t) => t.name === 'discovery_list_system_discovery',
    )!;

    const out = (await tool.handler({ limit: 1, offset: 0 })) as {
      data: Array<Record<string, unknown>>;
      totalCount: number;
      hasNextPage: boolean;
    };

    expect(out.totalCount).toBe(2);
    expect(out.hasNextPage).toBe(true);
    expect(out.data).toEqual([
      {
        title: 'Result 1',
        resourceId: 'arn:1',
        suggestedCatalog: 'Amazon Aurora',
        plugin: 'AWS',
        country: 'IE',
        countrySubDivision: undefined,
        containsSensitiveData: 'LIKELY',
        status: 'IGNORED',
      },
    ]);
    expect(sdk.fetch.mock.calls[0]![0]).toEqual({ marker: 'client' });
    expect(tool.readOnly).toBe(true);
  });
});
