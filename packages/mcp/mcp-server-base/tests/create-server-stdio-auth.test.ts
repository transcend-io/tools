import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthCredentials } from '../src/auth.js';
import type { CreateClientsArgs } from '../src/server/create-server.js';

const connect = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('../src/server/build-server.js', () => ({
  buildMcpServer: vi.fn(() => ({
    connect,
  })),
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn(),
}));

describe('createMCPServer stdio optional startup auth', () => {
  const originalApiKey = process.env.TRANSCEND_API_KEY;

  beforeEach(() => {
    connect.mockClear();
    delete process.env.TRANSCEND_API_KEY;
    vi.resetModules();
  });

  afterEach(() => {
    if (originalApiKey === undefined) delete process.env.TRANSCEND_API_KEY;
    else process.env.TRANSCEND_API_KEY = originalApiKey;
    vi.resetModules();
  });

  async function bootDocsLikeServer(): Promise<AuthCredentials | null> {
    let capturedAuth: AuthCredentials | null | undefined;
    const { createMCPServer } = await import('../src/server/create-server.js');
    await createMCPServer({
      name: 'test-stdio-auth',
      version: '0.0.0-test',
      requireStartupAuth: false,
      oauthScopes: [],
      getTools: () => [],
      createClients: (args: CreateClientsArgs) => {
        capturedAuth = args.auth;
        return {
          graphql: {},
          rest: {},
          dashboardUrl: 'https://app.transcend.io',
        } as never;
      },
    });
    expect(capturedAuth).toBeDefined();
    return capturedAuth ?? null;
  }

  it('passes API key credentials to createClients when TRANSCEND_API_KEY is set', async () => {
    process.env.TRANSCEND_API_KEY = 'stdio-api-key';

    const auth = await bootDocsLikeServer();

    expect(auth).toEqual({ type: 'apiKey', apiKey: 'stdio-api-key' });
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it('passes null auth when no credentials are configured', async () => {
    const auth = await bootDocsLikeServer();

    expect(auth).toBeNull();
    expect(connect).toHaveBeenCalledTimes(1);
  });
});
