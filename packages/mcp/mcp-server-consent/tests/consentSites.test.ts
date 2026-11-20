import { beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({
  pull: vi.fn(),
  sync: vi.fn(),
}));

vi.mock('@transcend-io/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@transcend-io/sdk')>()),
  pullTranscendConfiguration: sdk.pull,
  syncConfigurationToTranscend: sdk.sync,
}));

vi.mock('@transcend-io/mcp-server-base/transcend-yml', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@transcend-io/mcp-server-base/transcend-yml')>();
  return {
    ...actual,
    pushYmlSection: vi.fn(async (_clients, section, count) => {
      const result = await sdk.sync(section, {}, {});
      return { success: result.success, count, errors: result.errors ?? [] };
    }),
    listYmlSection: vi.fn(async (_clients, _resource, { offset = 0, limit = 50 } = {}) => {
      const config = (await sdk.pull({}, {})) as { 'consent-sites'?: unknown[] };
      const all = config['consent-sites'] ?? [];
      const data = all.slice(offset, offset + limit);
      return {
        data,
        totalCount: all.length,
        hasNextPage: offset + limit < all.length,
        count: data.length,
        success: true,
      };
    }),
  };
});

import { getConsentTools } from '../src/tools/index.js';

describe('consent sites tools', () => {
  const getTool = (name: string) =>
    getConsentTools({
      rest: {} as never,
      graphql: {} as never,
      dashboardUrl: 'https://app.transcend.io',
    }).find((tool) => tool.name === name)!;

  beforeEach(() => {
    sdk.pull.mockReset();
    sdk.sync.mockReset();
    sdk.sync.mockResolvedValue({ success: true, errors: [] });
  });

  it('consent_list_sites pages pull results', async () => {
    sdk.pull.mockResolvedValue({
      'consent-sites': [{ host: 'a.example.com' }, { host: 'b.example.com' }],
    });
    const tool = getTool('consent_list_sites');
    const page = (await tool.handler({ limit: 1, offset: 0 })) as { data: { host: string }[] };
    expect(page.data).toEqual([{ host: 'a.example.com' }]);
  });

  it('consent_write_sites syncs consent-sites through the push pipeline', async () => {
    const sites = [{ host: 'app.example.com', site: 'example.com' }];
    const tool = getTool('consent_write_sites');
    const result = await tool.handler({ sites });
    expect(sdk.sync).toHaveBeenCalledWith({ 'consent-sites': sites }, {}, {});
    expect(result).toMatchObject({ success: true, count: 1, errors: [] });
  });

  it('consent_write_sites rejects duplicate hosts in one call', async () => {
    const tool = getTool('consent_write_sites');
    const duplicate = [
      { host: 'a.example.com', site: 'example.com' },
      { host: 'a.example.com', site: 'example.com' },
    ];
    await expect(tool.handler({ sites: duplicate })).rejects.toThrow(/duplicate key/);
    expect(sdk.sync).not.toHaveBeenCalled();
  });
});
