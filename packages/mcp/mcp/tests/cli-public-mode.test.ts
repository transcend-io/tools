import type { McpHttpServerOptions } from '@transcend-io/mcp-server-base';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { runMcpHttp, createTranscendRestClient } = vi.hoisted(() => ({
  runMcpHttp: vi.fn().mockResolvedValue(undefined),
  createTranscendRestClient: vi.fn(() => ({})),
}));

vi.mock('@transcend-io/mcp-server-base', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@transcend-io/mcp-server-base')>()),
  runMcpHttp,
  createTranscendRestClient,
}));

// Each test re-imports the CLI after resetModules, which passes 5s on a busy machine.
describe('unified server CLI over HTTP', { timeout: 60_000 }, () => {
  const originalArgv = process.argv;

  beforeEach(() => {
    runMcpHttp.mockClear();
    createTranscendRestClient.mockClear();
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

  /** Starts the CLI with the given flags and returns the options a new session's REST client gets. */
  async function restClientOptionsForNewSession(flags: string[]): Promise<unknown> {
    process.argv = ['node', 'cli', '--transport', 'http', ...flags];
    await import('../src/cli.js');
    await vi.waitFor(() => expect(runMcpHttp).toHaveBeenCalledOnce());

    const [httpOptions] = runMcpHttp.mock.calls[0] as [McpHttpServerOptions];
    await httpOptions.createServer({ type: 'oauthToken', accessToken: 'token' });
    return createTranscendRestClient.mock.calls[0]?.[2];
  }

  it('requires the multi-tenant Sombra when a public URL is set', async () => {
    const options = await restClientOptionsForNewSession([
      '--public-url',
      'https://mcp.example.com',
    ]);

    expect(options).toMatchObject({ requireMultiTenantSombra: true });
  });

  it('allows a self-hosted Sombra when no public URL is set', async () => {
    const options = await restClientOptionsForNewSession([]);

    expect(options).toMatchObject({ requireMultiTenantSombra: false });
  });
});
