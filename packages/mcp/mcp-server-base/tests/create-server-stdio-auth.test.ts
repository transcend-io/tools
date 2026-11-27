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

// Each test re-imports create-server after resetModules, which passes 5s on a busy machine.
describe('createMCPServer stdio optional startup auth', { timeout: 30_000 }, () => {
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

  it('runs a login command instead of starting the server', async () => {
    const originalArgv = process.argv;
    const originalExitCode = process.exitCode;
    process.argv = [...originalArgv.slice(0, 2), 'status'];
    const stdout = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const getTools = vi.fn(() => []);
    try {
      const { createMCPServer } = await import('../src/server/create-server.js');
      await createMCPServer({
        name: 'test-stdio-auth',
        version: '0.0.0-test',
        oauthScopes: [],
        getTools,
      });

      expect(stdout.mock.calls.map(([line]) => line)).toEqual([
        'Credential store: memory (process memory (not saved))\n',
        'Not signed in.\n',
      ]);
      expect(process.exitCode).toBe(0);
      expect(getTools).not.toHaveBeenCalled();
      expect(connect).not.toHaveBeenCalled();
    } finally {
      stdout.mockRestore();
      process.argv = originalArgv;
      process.exitCode = originalExitCode;
    }
  });
});
