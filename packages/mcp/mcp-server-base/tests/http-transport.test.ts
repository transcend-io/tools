import type { AddressInfo } from 'node:net';

import { describe, it, expect, beforeAll, afterAll, vi, type Mock } from 'vitest';

import { getRequestAuth } from '../src/auth-context.js';
import type { AuthCredentials } from '../src/auth.js';
import {
  MCP_SESSION_ID_HEADER,
  TRANSCEND_ACTIVE_ORG_ID_HEADER,
  TRANSCEND_API_KEY_HEADER,
} from '../src/http-header-names.js';
import { buildMcpServer } from '../src/server/build-server.js';
import type { TransportConfig } from '../src/server/parse-args.js';
import { runMcpHttp, type McpHttpServer } from '../src/server/run-http.js';
import type { ToolDefinition } from '../src/tools/types.js';
import { z } from '../src/validation/index.js';

const TEST_API_KEY = 'test-api-key-for-http-transport';

const MCP_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'text/event-stream, application/json',
};

const echoTool: ToolDefinition = {
  name: 'echo',
  description: 'Returns the input message',
  category: 'test',
  readOnly: true,
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  zodSchema: z.object({ message: z.string() }),
  handler: async (args: { message: string }) => ({ echo: args.message }),
};

function testConfig(port: number): TransportConfig {
  return {
    transport: 'http',
    port,
    host: '127.0.0.1',
    mcpPath: '/mcp',
    corsOrigins: [],
    sessionTtlMs: 60_000,
  };
}

/** Parse SSE data: lines from a response body. */
function parseSseData(text: string): unknown[] {
  return text
    .split('\n')
    .filter((l) => l.startsWith('data: '))
    .map((l) => JSON.parse(l.slice(6)));
}

describe('HTTP Transport', () => {
  let httpServer: McpHttpServer;
  let baseUrl: string;

  beforeAll(async () => {
    process.env.TRANSCEND_API_KEY = TEST_API_KEY;

    httpServer = await runMcpHttp(
      {
        name: 'test-server',
        version: '0.0.1',
        createServer: (_auth) =>
          buildMcpServer({
            name: 'test-server',
            version: '0.0.1',
            tools: [echoTool],
            transport: 'http',
          }),
      },
      testConfig(0),
    );

    const addr = httpServer.httpServer.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    await httpServer.shutdown();
  });

  it('GET /health returns server status', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toEqual({
      status: 'ok',
      name: 'test-server',
      version: '0.0.1',
    });
  });

  it('POST /mcp without session ID or initialize request returns 400', async () => {
    const res = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: MCP_HEADERS,
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/list',
        params: {},
        id: 1,
      }),
    });
    expect(res.status).toBe(400);
  });

  describe('session lifecycle', () => {
    let sessionId: string;

    it('initializes a session', async () => {
      const res = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: MCP_HEADERS,
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'initialize',
          params: {
            protocolVersion: '2025-11-25',
            capabilities: {},
            clientInfo: { name: 'test-client', version: '0.1.0' },
          },
          id: 1,
        }),
      });

      expect(res.status).toBe(200);
      sessionId = res.headers.get(MCP_SESSION_ID_HEADER)!;
      expect(sessionId).toBeTruthy();
    });

    it('sends initialized notification', async () => {
      const res = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          ...MCP_HEADERS,
          [MCP_SESSION_ID_HEADER]: sessionId,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'notifications/initialized',
        }),
      });

      // Notifications return 202 (no response body) or 200
      expect([200, 202, 204]).toContain(res.status);
    });

    it('lists tools via tools/list', async () => {
      const res = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          ...MCP_HEADERS,
          [MCP_SESSION_ID_HEADER]: sessionId,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/list',
          params: {},
          id: 2,
        }),
      });

      expect(res.status).toBe(200);
      const text = await res.text();
      const dataLines = parseSseData(text);
      const toolListResponse = dataLines.find((d: any) => d.id === 2) as any;
      expect(toolListResponse).toBeDefined();
      expect(toolListResponse.result.tools).toHaveLength(1);
      expect(toolListResponse.result.tools[0].name).toBe('echo');
    });

    it('calls a tool via tools/call', async () => {
      const res = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          ...MCP_HEADERS,
          [MCP_SESSION_ID_HEADER]: sessionId,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: { name: 'echo', arguments: { message: 'hello' } },
          id: 3,
        }),
      });

      expect(res.status).toBe(200);
      const text = await res.text();
      const dataLines = parseSseData(text);
      const callResponse = dataLines.find((d: any) => d.id === 3) as any;
      expect(callResponse).toBeDefined();
      const content = JSON.parse(callResponse.result.content[0].text);
      expect(content.echo).toBe('hello');
    });

    it('terminates session via DELETE', async () => {
      const res = await fetch(`${baseUrl}/mcp`, {
        method: 'DELETE',
        headers: {
          Accept: 'text/event-stream, application/json',
          [MCP_SESSION_ID_HEADER]: sessionId,
        },
      });
      expect(res.status).toBe(200);

      // Subsequent request with old session ID should fail
      const res2 = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          ...MCP_HEADERS,
          [MCP_SESSION_ID_HEADER]: sessionId,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/list',
          params: {},
          id: 4,
        }),
      });
      // Session gone — either 400 from our handler or 404 from SDK transport
      expect([400, 404]).toContain(res2.status);
    });
  });

  describe('API key from headers', () => {
    it('accepts API key from Authorization header', async () => {
      const res = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          ...MCP_HEADERS,
          Authorization: `Bearer ${TEST_API_KEY}`,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'initialize',
          params: {
            protocolVersion: '2025-11-25',
            capabilities: {},
            clientInfo: { name: 'header-test', version: '0.1.0' },
          },
          id: 1,
        }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get(MCP_SESSION_ID_HEADER)).toBeTruthy();
    });

    it('accepts API key from X-Transcend-Api-Key header', async () => {
      const res = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          ...MCP_HEADERS,
          [TRANSCEND_API_KEY_HEADER]: TEST_API_KEY,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'initialize',
          params: {
            protocolVersion: '2025-11-25',
            capabilities: {},
            clientInfo: { name: 'header-test-2', version: '0.1.0' },
          },
          id: 1,
        }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get(MCP_SESSION_ID_HEADER)).toBeTruthy();
    });
  });

  describe('session cookie authentication', () => {
    it(`initializes a session with Cookie + ${TRANSCEND_ACTIVE_ORG_ID_HEADER} headers`, async () => {
      const res = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          ...MCP_HEADERS,
          Cookie: 'laravel_session=session-token-abc',
          [TRANSCEND_ACTIVE_ORG_ID_HEADER]: 'org-uuid-123',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'initialize',
          params: {
            protocolVersion: '2025-11-25',
            capabilities: {},
            clientInfo: { name: 'cookie-test', version: '0.1.0' },
          },
          id: 1,
        }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get(MCP_SESSION_ID_HEADER)).toBeTruthy();
    });

    it('cookie-authed session can call tools', async () => {
      const initRes = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          ...MCP_HEADERS,
          Cookie: 'laravel_session=session-for-tool-call',
          [TRANSCEND_ACTIVE_ORG_ID_HEADER]: 'org-uuid-456',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'initialize',
          params: {
            protocolVersion: '2025-11-25',
            capabilities: {},
            clientInfo: { name: 'cookie-tool-test', version: '0.1.0' },
          },
          id: 1,
        }),
      });

      const sessionId = initRes.headers.get(MCP_SESSION_ID_HEADER)!;
      expect(sessionId).toBeTruthy();

      // Send initialized notification
      await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: { ...MCP_HEADERS, [MCP_SESSION_ID_HEADER]: sessionId },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'notifications/initialized',
        }),
      });

      // Call a tool
      const res = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: { ...MCP_HEADERS, [MCP_SESSION_ID_HEADER]: sessionId },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: { name: 'echo', arguments: { message: 'cookie-test' } },
          id: 2,
        }),
      });

      expect(res.status).toBe(200);
      const text = await res.text();
      const dataLines = parseSseData(text);
      const callResponse = dataLines.find((d: any) => d.id === 2) as any;
      expect(callResponse).toBeDefined();
      const content = JSON.parse(callResponse.result.content[0].text);
      expect(content.echo).toBe('cookie-test');
    });

    it('different customers get isolated sessions', async () => {
      const initA = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          ...MCP_HEADERS,
          Cookie: 'laravel_session=customer-a-session',
          [TRANSCEND_ACTIVE_ORG_ID_HEADER]: 'org-a',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'initialize',
          params: {
            protocolVersion: '2025-11-25',
            capabilities: {},
            clientInfo: { name: 'customer-a', version: '0.1.0' },
          },
          id: 1,
        }),
      });

      const initB = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          ...MCP_HEADERS,
          Cookie: 'laravel_session=customer-b-session',
          [TRANSCEND_ACTIVE_ORG_ID_HEADER]: 'org-b',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'initialize',
          params: {
            protocolVersion: '2025-11-25',
            capabilities: {},
            clientInfo: { name: 'customer-b', version: '0.1.0' },
          },
          id: 1,
        }),
      });

      const sessionA = initA.headers.get(MCP_SESSION_ID_HEADER)!;
      const sessionB = initB.headers.get(MCP_SESSION_ID_HEADER)!;

      expect(sessionA).toBeTruthy();
      expect(sessionB).toBeTruthy();
      expect(sessionA).not.toBe(sessionB);
    });
  });

  describe('auth-free initialization (sidecar pattern)', () => {
    let sidecarServer: McpHttpServer;
    let sidecarUrl: string;
    let capturedAuthSpy: Mock<(auth: AuthCredentials | null) => void>;

    const authCaptureTool: ToolDefinition = {
      name: 'capture_auth',
      description: 'Captures the per-request auth from AsyncLocalStorage',
      category: 'test',
      readOnly: true,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      zodSchema: z.object({ message: z.string() }),
      handler: async (args: { message: string }) => {
        const auth = getRequestAuth();
        capturedAuthSpy(auth);
        return { echo: args.message, hasAuth: auth !== null };
      },
    };

    beforeAll(async () => {
      delete process.env.TRANSCEND_API_KEY;

      capturedAuthSpy = vi.fn();

      sidecarServer = await runMcpHttp(
        {
          name: 'sidecar-test',
          version: '0.0.1',
          createServer: (_auth) =>
            buildMcpServer({
              name: 'sidecar-test',
              version: '0.0.1',
              tools: [authCaptureTool],
              transport: 'http',
            }),
        },
        testConfig(0),
      );

      const addr = sidecarServer.httpServer.address() as AddressInfo;
      sidecarUrl = `http://127.0.0.1:${addr.port}`;
    });

    afterAll(async () => {
      await sidecarServer.shutdown();
      process.env.TRANSCEND_API_KEY = TEST_API_KEY;
    });

    it('initializes without any auth credentials', async () => {
      const res = await fetch(`${sidecarUrl}/mcp`, {
        method: 'POST',
        headers: MCP_HEADERS,
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'initialize',
          params: {
            protocolVersion: '2025-11-25',
            capabilities: {},
            clientInfo: { name: 'sidecar-client', version: '0.1.0' },
          },
          id: 1,
        }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get(MCP_SESSION_ID_HEADER)).toBeTruthy();
    });

    it('propagates per-request auth via AsyncLocalStorage when headers present', async () => {
      const initRes = await fetch(`${sidecarUrl}/mcp`, {
        method: 'POST',
        headers: MCP_HEADERS,
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'initialize',
          params: {
            protocolVersion: '2025-11-25',
            capabilities: {},
            clientInfo: { name: 'per-req-auth-test', version: '0.1.0' },
          },
          id: 1,
        }),
      });

      const sessionId = initRes.headers.get(MCP_SESSION_ID_HEADER)!;
      expect(sessionId).toBeTruthy();

      await fetch(`${sidecarUrl}/mcp`, {
        method: 'POST',
        headers: { ...MCP_HEADERS, [MCP_SESSION_ID_HEADER]: sessionId },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'notifications/initialized',
        }),
      });

      capturedAuthSpy.mockClear();

      await fetch(`${sidecarUrl}/mcp`, {
        method: 'POST',
        headers: {
          ...MCP_HEADERS,
          [MCP_SESSION_ID_HEADER]: sessionId,
          Cookie: 'laravel_session=user-a-session',
          [TRANSCEND_ACTIVE_ORG_ID_HEADER]: 'org-a-uuid',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: { name: 'capture_auth', arguments: { message: 'per-request-auth' } },
          id: 2,
        }),
      });

      expect(capturedAuthSpy).toHaveBeenCalledOnce();
      expect(capturedAuthSpy.mock.calls[0][0]).toEqual({
        type: 'sessionCookie',
        cookie: 'laravel_session=user-a-session',
        organizationId: 'org-a-uuid',
      });
    });

    it('does not set auth context when request has no auth headers', async () => {
      const initRes = await fetch(`${sidecarUrl}/mcp`, {
        method: 'POST',
        headers: MCP_HEADERS,
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'initialize',
          params: {
            protocolVersion: '2025-11-25',
            capabilities: {},
            clientInfo: { name: 'no-auth-context-test', version: '0.1.0' },
          },
          id: 1,
        }),
      });

      const sessionId = initRes.headers.get(MCP_SESSION_ID_HEADER)!;

      await fetch(`${sidecarUrl}/mcp`, {
        method: 'POST',
        headers: { ...MCP_HEADERS, [MCP_SESSION_ID_HEADER]: sessionId },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'notifications/initialized',
        }),
      });

      capturedAuthSpy.mockClear();

      await fetch(`${sidecarUrl}/mcp`, {
        method: 'POST',
        headers: { ...MCP_HEADERS, [MCP_SESSION_ID_HEADER]: sessionId },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: { name: 'capture_auth', arguments: { message: 'no-auth' } },
          id: 2,
        }),
      });

      expect(capturedAuthSpy).toHaveBeenCalledOnce();
      expect(capturedAuthSpy.mock.calls[0][0]).toBeNull();
    });
  });
});

describe('HTTP Transport — public hosted mode (OAuth protected resource metadata)', () => {
  const PUBLIC_URL = 'https://mcp.example.com';
  const AUTH_SERVER_URL = 'https://api.example.com/graphql';
  const INIT_BODY = JSON.stringify({
    jsonrpc: '2.0',
    method: 'initialize',
    params: {
      protocolVersion: '2025-11-25',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '0.1.0' },
    },
    id: 1,
  });

  const serversToClose: McpHttpServer[] = [];
  let previousEnvKey: string | undefined;

  beforeAll(() => {
    previousEnvKey = process.env.TRANSCEND_API_KEY;
  });

  afterAll(async () => {
    for (const server of serversToClose) await server.shutdown();
    if (previousEnvKey === undefined) delete process.env.TRANSCEND_API_KEY;
    else process.env.TRANSCEND_API_KEY = previousEnvKey;
  });

  async function start(
    publicUrl: string | undefined,
    extra: Partial<TransportConfig> = {},
  ): Promise<{ baseUrl: string; authSeen: Array<AuthCredentials | null> }> {
    const authSeen: Array<AuthCredentials | null> = [];
    const server = await runMcpHttp(
      {
        name: 'test-server',
        version: '0.0.1',
        authorizationServerUrl: AUTH_SERVER_URL,
        scopesSupported: ['read:things', 'write:things'],
        createServer: (auth) => {
          authSeen.push(auth);
          return buildMcpServer({
            name: 'test-server',
            version: '0.0.1',
            tools: [echoTool],
            transport: 'http',
          });
        },
      },
      { ...testConfig(0), ...(publicUrl && { publicUrl }), ...extra },
    );
    serversToClose.push(server);
    const addr = server.httpServer.address() as AddressInfo;
    return { baseUrl: `http://127.0.0.1:${addr.port}`, authSeen };
  }

  it('serves RFC 9728 metadata at the bare and path-suffixed well-known URLs', async () => {
    const { baseUrl } = await start(`${PUBLIC_URL}/`);
    for (const path of [
      '/.well-known/oauth-protected-resource',
      '/.well-known/oauth-protected-resource/mcp',
    ]) {
      const res = await fetch(`${baseUrl}${path}`);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        resource: `${PUBLIC_URL}/mcp`,
        authorization_servers: ['https://api.example.com'],
        bearer_methods_supported: ['header'],
        scopes_supported: ['read:things', 'write:things'],
      });
    }
  });

  it('honors a custom mcpPath in the metadata and challenge', async () => {
    const { baseUrl } = await start(PUBLIC_URL, { mcpPath: '/v1/mcp' });
    const meta = await fetch(`${baseUrl}/.well-known/oauth-protected-resource/v1/mcp`);
    expect((await meta.json()).resource).toBe(`${PUBLIC_URL}/v1/mcp`);

    const res = await fetch(`${baseUrl}/v1/mcp`, {
      method: 'POST',
      headers: MCP_HEADERS,
      body: INIT_BODY,
    });
    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toBe(
      `Bearer resource_metadata="${PUBLIC_URL}/.well-known/oauth-protected-resource/v1/mcp"`,
    );
  });

  it('answers 401 with a WWW-Authenticate challenge on POST, GET and DELETE without auth', async () => {
    const { baseUrl } = await start(PUBLIC_URL);
    const expectedChallenge = `Bearer resource_metadata="${PUBLIC_URL}/.well-known/oauth-protected-resource/mcp"`;

    for (const method of ['POST', 'GET', 'DELETE']) {
      const res = await fetch(`${baseUrl}/mcp`, {
        method,
        headers: MCP_HEADERS,
        ...(method === 'POST' && { body: INIT_BODY }),
      });
      expect(res.status, method).toBe(401);
      expect(res.headers.get('www-authenticate'), method).toBe(expectedChallenge);
      expect(await res.json()).toMatchObject({ jsonrpc: '2.0', error: { code: -32001 }, id: null });
    }
  });

  it('does not let the TRANSCEND_API_KEY env fallback authenticate public callers', async () => {
    process.env.TRANSCEND_API_KEY = 'server-side-key-must-be-ignored';
    const { baseUrl, authSeen } = await start(PUBLIC_URL);
    const res = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: MCP_HEADERS,
      body: INIT_BODY,
    });
    expect(res.status).toBe(401);
    expect(authSeen).toEqual([]);
  });

  it('leaves /health public', async () => {
    const { baseUrl } = await start(PUBLIC_URL);
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
  });

  it('initializes with a Bearer token and forwards it as the caller credential', async () => {
    delete process.env.TRANSCEND_API_KEY;
    const { baseUrl, authSeen } = await start(PUBLIC_URL);
    const res = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { ...MCP_HEADERS, Authorization: 'Bearer oauth-access-token' },
      body: INIT_BODY,
    });
    expect(res.status).toBe(200);
    expect(res.headers.get(MCP_SESSION_ID_HEADER)).toBeTruthy();
    expect(authSeen).toEqual([{ type: 'apiKey', apiKey: 'oauth-access-token' }]);
  });

  it('exposes WWW-Authenticate to browser clients via CORS', async () => {
    const { baseUrl } = await start(PUBLIC_URL, { corsOrigins: ['https://client.example.com'] });
    const res = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { ...MCP_HEADERS, Origin: 'https://client.example.com' },
      body: INIT_BODY,
    });
    expect(res.status).toBe(401);
    expect(res.headers.get('access-control-expose-headers')).toContain('WWW-Authenticate');
  });

  it('requires an authorization server when a public URL is configured', async () => {
    await expect(
      runMcpHttp(
        {
          name: 'test-server',
          version: '0.0.1',
          createServer: () =>
            buildMcpServer({
              name: 'test-server',
              version: '0.0.1',
              tools: [echoTool],
              transport: 'http',
            }),
        },
        { ...testConfig(0), publicUrl: PUBLIC_URL },
      ),
    ).rejects.toThrow(/authorizationServerUrl/);
  });

  it('is unchanged when the public URL is unset: no metadata, no challenge, env key still works', async () => {
    process.env.TRANSCEND_API_KEY = 'env-key';
    const { baseUrl, authSeen } = await start(undefined);

    const meta = await fetch(`${baseUrl}/.well-known/oauth-protected-resource`);
    expect(meta.status).toBe(404);

    const withEnvKey = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: MCP_HEADERS,
      body: INIT_BODY,
    });
    expect(withEnvKey.status).toBe(200);
    expect(withEnvKey.headers.get('www-authenticate')).toBeNull();
    expect(authSeen).toEqual([{ type: 'apiKey', apiKey: 'env-key' }]);

    // Sidecar case: no credentials anywhere still initializes (auth-free handshake).
    delete process.env.TRANSCEND_API_KEY;
    const sidecar = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: MCP_HEADERS,
      body: INIT_BODY,
    });
    expect(sidecar.status).toBe(200);
    expect(authSeen[1]).toBeNull();
  });
});
