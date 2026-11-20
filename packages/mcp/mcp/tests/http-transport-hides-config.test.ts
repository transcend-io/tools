import { buildMcpServer, TranscendRestClient } from '@transcend-io/mcp-server-base';
import { describe, expect, it } from 'vitest';

import { TranscendGraphQLClient } from '../src/graphql-client.js';
import { ToolRegistry } from '../src/registry.js';

const AUTH = { type: 'apiKey', apiKey: 'test-key' } as const;

/** Names the server lists for a transport, through its real `tools/list` handler. */
async function listedNames(transport: 'stdio' | 'http'): Promise<string[]> {
  const registry = new ToolRegistry({
    rest: new TranscendRestClient(AUTH, 'http://localhost:0'),
    graphql: new TranscendGraphQLClient(AUTH, 'http://localhost:0'),
    dashboardUrl: 'https://app.transcend.io',
  });
  const server = buildMcpServer({
    name: 'test',
    version: '0.0.0',
    tools: registry.getAllTools(),
    transport,
  });
  const handlers = (
    server as unknown as {
      _requestHandlers: Map<
        string,
        (req: unknown, extra: unknown) => Promise<{ tools: Array<{ name: string }> }>
      >;
    }
  )._requestHandlers;
  const result = await handlers.get('tools/list')!({ method: 'tools/list', params: {} }, {});
  return result.tools.map((tool) => tool.name);
}

describe('unified server and local filesystem tools', () => {
  it('lists the disk tools over stdio', async () => {
    const names = await listedNames('stdio');
    expect(names).toContain('config_pull');
    expect(names).toContain('config_diff');
    expect(names).toContain('config_get_schema');
  });

  it('omits config disk tools over http but keeps config_get_schema', async () => {
    const names = await listedNames('http');
    expect(names).not.toContain('config_pull');
    expect(names).not.toContain('config_diff');
    expect(names).not.toContain('config_push');
    expect(names).toContain('config_get_schema');
  });
});
