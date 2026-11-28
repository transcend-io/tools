import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CreateClientsArgs } from '../src/server/create-server.js';
import type { McpHttpServerOptions } from '../src/server/run-http.js';

const runMcpHttp = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('../src/server/run-http.js', () => ({ runMcpHttp }));

vi.mock('../src/server/build-server.js', () => ({
  buildMcpServer: vi.fn(() => ({})),
}));

// Each test re-imports create-server after resetModules, which passes 5s on a busy machine.
describe('createMCPServer over HTTP', { timeout: 30_000 }, () => {
  const originalArgv = process.argv;

  beforeEach(() => {
    runMcpHttp.mockClear();
    vi.stubEnv('TRANSCEND_API_KEY', '');
    vi.stubEnv('TRANSCEND_MCP_PUBLIC_URL', '');
    vi.stubEnv('TRANSCEND_MCP_INTROSPECTION_CLIENT_ID', 'mcp-resource-server');
    vi.stubEnv('TRANSCEND_MCP_INTROSPECTION_CLIENT_SECRET', 's3cret');
    vi.resetModules();
  });

  afterEach(() => {
    process.argv = originalArgv;
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  /** Boots the server with the given CLI flags and returns what a new session's client factory receives. */
  async function clientArgsForNewSession(flags: string[]): Promise<CreateClientsArgs> {
    process.argv = ['node', 'cli', '--transport', 'http', ...flags];
    let clientArgs: CreateClientsArgs | undefined;
    const { createMCPServer } = await import('../src/server/create-server.js');
    await createMCPServer({
      name: 'test-http',
      version: '0.0.0-test',
      requireStartupAuth: false,
      oauthScopes: [],
      getTools: () => [],
      createClients: (args) => {
        clientArgs = args;
        return { graphql: {}, rest: {}, dashboardUrl: args.dashboardUrl } as never;
      },
    });

    const [httpOptions] = runMcpHttp.mock.calls[0] as [McpHttpServerOptions];
    await httpOptions.createServer({ type: 'oauthToken', accessToken: 'token' });
    return clientArgs!;
  }

  it('requires the multi-tenant Sombra when a public URL is set', async () => {
    const args = await clientArgsForNewSession(['--public-url', 'https://mcp.example.com']);

    expect(args.requireMultiTenantSombra).toBe(true);
  });

  it('allows a self-hosted Sombra when no public URL is set', async () => {
    const args = await clientArgsForNewSession([]);

    expect(args.requireMultiTenantSombra).toBe(false);
  });
});
