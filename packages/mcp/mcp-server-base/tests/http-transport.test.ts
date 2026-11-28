import { createServer as createHttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import { describe, it, expect, beforeAll, beforeEach, afterAll, vi, type Mock } from 'vitest';

import { getRequestAuth } from '../src/auth-context.js';
import type { AuthCredentials } from '../src/auth.js';
import { TranscendGraphQLBase } from '../src/clients/graphql/base.js';
import {
  MCP_SESSION_ID_HEADER,
  TRANSCEND_ACTIVE_ORG_ID_HEADER,
  TRANSCEND_API_KEY_HEADER,
} from '../src/http-header-names.js';
import { buildMcpServer } from '../src/server/build-server.js';
import type { TransportConfig } from '../src/server/parse-args.js';
import { createTranscendRestClient } from '../src/server/resolve-sombra-url.js';
import { runMcpHttp, type McpHttpServer } from '../src/server/run-http.js';
import { McpTransport } from '../src/server/transport.js';
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
    transport: McpTransport.Http,
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
            transport: McpTransport.Http,
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
              transport: McpTransport.Http,
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

/**
 * One local HTTP server that plays every upstream of the public endpoint: the OAuth
 * authorization server (metadata and token introspection), the GraphQL API, and Sombra.
 */
async function startFakeBackend() {
  const state = {
    /** Introspection response per access token. Unknown tokens are inactive. */
    tokens: new Map<string, Record<string, unknown>>(),
    /** `organization` GraphQL payload per credential */
    organizations: new Map<string, Record<string, unknown>>(),
    /** Every token sent to the introspection endpoint, in order */
    introspectedTokens: [] as string[],
    /** `Authorization` header of the latest introspection call */
    introspectionAuthorization: undefined as string | undefined,
    /** When true, the introspection endpoint answers 500 */
    introspectionDown: false,
    /** Calls that reached Sombra */
    sombraCalls: 0,
  };

  const server = createHttpServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const body = Buffer.concat(chunks).toString();
    const origin = `http://${req.headers.host}`;
    const bearer = req.headers.authorization?.replace(/^Bearer /, '') ?? '';
    const json = (status: number, payload: unknown): void => {
      res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(payload));
    };

    switch (`${req.method} ${req.url}`) {
      case 'GET /.well-known/oauth-authorization-server':
        json(200, {
          issuer: origin,
          authorization_endpoint: `${origin}/oauth/authorize`,
          token_endpoint: `${origin}/oauth/token`,
          introspection_endpoint: `${origin}/oauth/introspect`,
          code_challenge_methods_supported: ['S256'],
        });
        return;
      case 'POST /oauth/introspect': {
        const token = new URLSearchParams(body).get('token') ?? '';
        state.introspectedTokens.push(token);
        state.introspectionAuthorization = req.headers.authorization;
        if (state.introspectionDown) json(500, { error: 'server_error' });
        else json(200, state.tokens.get(token) ?? { active: false });
        return;
      }
      case 'POST /graphql':
        json(200, { data: { organization: state.organizations.get(bearer) } });
        return;
      case 'GET /public-keys/sombra-general-signing-key':
        state.sombraCalls += 1;
        json(200, { key: 'sombra-public-key' });
        return;
      default:
        json(404, { error: 'not_found' });
    }
  });
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  return {
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    reset(): void {
      state.tokens.clear();
      state.organizations.clear();
      state.introspectedTokens.length = 0;
      state.introspectionAuthorization = undefined;
      state.introspectionDown = false;
      state.sombraCalls = 0;
    },
    state,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  };
}

describe('HTTP Transport in public hosted mode', () => {
  const PUBLIC_URL = 'https://mcp.example.com';
  const RESOURCE = `${PUBLIC_URL}/mcp`;
  const RESOURCE_METADATA = `resource_metadata="${PUBLIC_URL}/.well-known/oauth-protected-resource/mcp"`;
  const INTROSPECTION_CLIENT = { clientId: 'mcp-resource-server', clientSecret: 's3cret:/+ value' };
  const START_MS = Date.parse('2026-01-01T00:00:00Z');
  const START_SECONDS = START_MS / 1000;
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
  let backend: Awaited<ReturnType<typeof startFakeBackend>>;
  let nowMs: number;
  let previousEnvKey: string | undefined;

  beforeAll(async () => {
    previousEnvKey = process.env.TRANSCEND_API_KEY;
    backend = await startFakeBackend();
  });

  beforeEach(() => {
    delete process.env.TRANSCEND_API_KEY;
    backend.reset();
    nowMs = START_MS;
  });

  afterAll(async () => {
    for (const server of serversToClose) await server.shutdown();
    await backend.close();
    if (previousEnvKey === undefined) delete process.env.TRANSCEND_API_KEY;
    else process.env.TRANSCEND_API_KEY = previousEnvKey;
  });

  /** Registers an access token that the authorization server reports as active. */
  function issueToken(token: string, claims: Record<string, unknown> = {}): void {
    backend.state.tokens.set(token, {
      active: true,
      exp: START_SECONDS + 3600,
      aud: RESOURCE,
      client_id: 'chat-client',
      sub: 'user-1',
      scope: 'read:things',
      ...claims,
    });
  }

  /** Sets the organization that a credential belongs to, as the GraphQL API reports it. */
  function setOrganization(
    credential: string,
    sombra: Record<string, unknown>,
    aiSetting = { isAiEnabled: true, isMcpSombraEnabled: true },
  ): void {
    backend.state.organizations.set(credential, {
      sombra: { customerUrl: backend.url, ...sombra },
      aiSetting,
    });
  }

  const bearer = (token: string): Record<string, string> => ({ Authorization: `Bearer ${token}` });

  async function start(
    publicUrl: string | undefined,
    extra: Partial<TransportConfig> = {},
  ): Promise<{
    /** Local URL of the started MCP server */
    baseUrl: string;
    /** Credentials each new session was created with */
    authSeen: Array<AuthCredentials | null>;
  }> {
    const authSeen: Array<AuthCredentials | null> = [];
    const server = await runMcpHttp(
      {
        name: 'test-server',
        version: '0.0.1',
        authorizationServerUrl: backend.url,
        scopesSupported: ['read:things', 'write:things'],
        now: () => nowMs,
        createServer: (auth) => {
          authSeen.push(auth);
          const graphql = new TranscendGraphQLBase(auth, backend.url);
          const rest = createTranscendRestClient(auth, graphql, {
            requireMultiTenantSombra: Boolean(publicUrl),
          });
          const sombraTool: ToolDefinition = {
            name: 'sombra_public_key',
            description: 'Reads a key from Sombra',
            category: 'test',
            readOnly: true,
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
            zodSchema: z.object({}),
            handler: () => rest.getSombraPublicKey(),
          };
          return buildMcpServer({
            name: 'test-server',
            version: '0.0.1',
            tools: [echoTool, sombraTool],
            transport: 'http',
          });
        },
      },
      {
        ...testConfig(0),
        ...(publicUrl && { publicUrl, introspectionClient: INTROSPECTION_CLIENT }),
        ...extra,
      },
    );
    serversToClose.push(server);
    const addr = server.httpServer.address() as AddressInfo;
    return { baseUrl: `http://127.0.0.1:${addr.port}`, authSeen };
  }

  function initialize(baseUrl: string, headers: Record<string, string> = {}): Promise<Response> {
    return fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { ...MCP_HEADERS, ...headers },
      body: INIT_BODY,
    });
  }

  /** Opens a session and returns its ID. */
  async function openSession(baseUrl: string, headers: Record<string, string>): Promise<string> {
    const res = await initialize(baseUrl, headers);
    expect(res.status).toBe(200);
    const sessionId = res.headers.get(MCP_SESSION_ID_HEADER)!;
    await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { ...MCP_HEADERS, ...headers, [MCP_SESSION_ID_HEADER]: sessionId },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    });
    return sessionId;
  }

  /** Calls a tool on an open session. `text` is the tool output when the call got through. */
  async function callTool(
    baseUrl: string,
    sessionId: string,
    headers: Record<string, string>,
    name: string,
    args: Record<string, unknown> = {},
  ): Promise<{
    /** HTTP status of the call */
    status: number;
    /** `WWW-Authenticate` header of the response */
    challenge: string | null;
    /** Text of the tool result */
    text?: string;
  }> {
    const res = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { ...MCP_HEADERS, ...headers, [MCP_SESSION_ID_HEADER]: sessionId },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: { name, arguments: args },
        id: 2,
      }),
    });
    const challenge = res.headers.get('www-authenticate');
    if (res.status !== 200) return { status: res.status, challenge };
    const response = parseSseData(await res.text()).find((d: any) => d.id === 2) as any;
    return { status: res.status, challenge, text: response.result.content[0].text };
  }

  describe('protected resource metadata', () => {
    it('serves RFC 9728 metadata at the bare and path-suffixed well-known URLs', async () => {
      const { baseUrl } = await start(`${PUBLIC_URL}/`);
      for (const path of [
        '/.well-known/oauth-protected-resource',
        '/.well-known/oauth-protected-resource/mcp',
      ]) {
        const res = await fetch(`${baseUrl}${path}`);
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({
          resource: RESOURCE,
          authorization_servers: [backend.url],
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

    it('leaves /health public', async () => {
      const { baseUrl } = await start(PUBLIC_URL);
      const res = await fetch(`${baseUrl}/health`);
      expect(res.status).toBe(200);
    });

    it('exposes WWW-Authenticate to browser clients via CORS', async () => {
      const { baseUrl } = await start(PUBLIC_URL, { corsOrigins: ['https://client.example.com'] });
      const res = await initialize(baseUrl, { Origin: 'https://client.example.com' });
      expect(res.status).toBe(401);
      expect(res.headers.get('access-control-expose-headers')).toContain('WWW-Authenticate');
    });
  });

  describe('startup', () => {
    const serverOptions = {
      name: 'test-server',
      version: '0.0.1',
      createServer: () =>
        buildMcpServer({
          name: 'test-server',
          version: '0.0.1',
          tools: [echoTool],
          transport: 'http' as const,
        }),
    };

    it('requires an authorization server when a public URL is configured', async () => {
      await expect(
        runMcpHttp(serverOptions, {
          ...testConfig(0),
          publicUrl: PUBLIC_URL,
          introspectionClient: INTROSPECTION_CLIENT,
        }),
      ).rejects.toThrow(/authorizationServerUrl/);
    });

    it('requires introspection credentials when a public URL is configured', async () => {
      await expect(
        runMcpHttp(
          { ...serverOptions, authorizationServerUrl: backend.url },
          { ...testConfig(0), publicUrl: PUBLIC_URL },
        ),
      ).rejects.toThrow(/introspectionClient/);
    });
  });

  describe('token verification', () => {
    it('answers 401 with a WWW-Authenticate challenge on every method without credentials', async () => {
      const { baseUrl, authSeen } = await start(PUBLIC_URL);

      const head = await fetch(`${baseUrl}/mcp`, { method: 'HEAD' });
      expect(head.status).toBe(401);
      expect(head.headers.get('www-authenticate')).toBe(`Bearer ${RESOURCE_METADATA}`);

      for (const method of ['POST', 'GET', 'DELETE']) {
        const res = await fetch(`${baseUrl}/mcp`, {
          method,
          headers: MCP_HEADERS,
          ...(method === 'POST' && { body: INIT_BODY }),
        });
        expect(res.status, method).toBe(401);
        expect(res.headers.get('www-authenticate'), method).toBe(`Bearer ${RESOURCE_METADATA}`);
        expect(await res.json()).toMatchObject({
          jsonrpc: '2.0',
          error: { code: -32001 },
          id: null,
        });
      }
      expect(authSeen).toEqual([]);
    });

    it('accepts an active token issued for this server and forwards it as the caller credential', async () => {
      issueToken('good-token');
      const { baseUrl, authSeen } = await start(PUBLIC_URL);

      const res = await initialize(baseUrl, bearer('good-token'));

      expect(res.status).toBe(200);
      expect(res.headers.get(MCP_SESSION_ID_HEADER)).toBeTruthy();
      expect(authSeen).toEqual([
        { type: 'oauthToken', accessToken: 'good-token', expiresAt: START_MS + 3_600_000 },
      ]);
    });

    it('authenticates to the introspection endpoint with client_secret_basic', async () => {
      issueToken('good-token');
      const { baseUrl } = await start(PUBLIC_URL);

      await initialize(baseUrl, bearer('good-token'));

      const [scheme, credentials] = backend.state.introspectionAuthorization!.split(' ');
      expect(scheme).toBe('Basic');
      expect(Buffer.from(credentials!, 'base64').toString()).toBe(
        `mcp-resource-server:${encodeURIComponent(INTROSPECTION_CLIENT.clientSecret)}`,
      );
    });

    it('accepts a token whose audience list includes this server', async () => {
      issueToken('multi-audience-token', { aud: ['https://other.example.com', RESOURCE] });
      const { baseUrl } = await start(PUBLIC_URL);

      const res = await initialize(baseUrl, bearer('multi-audience-token'));

      expect(res.status).toBe(200);
    });

    it.each([
      ['inactive', { active: false }],
      ['expired', { exp: START_SECONDS - 1 }],
      ['expiring this instant', { exp: START_SECONDS }],
      ['missing an expiry', { exp: undefined }],
      ['issued for another server', { aud: 'https://other.example.com/mcp' }],
      ['issued for a list of other servers', { aud: ['https://other.example.com/mcp'] }],
      ['issued for a URL that only starts like this server', { aud: `${RESOURCE}/` }],
      ['missing an audience', { aud: undefined }],
    ])('answers 401 invalid_token for a token that is %s', async (_label, claims) => {
      issueToken('bad-token', claims);
      const { baseUrl, authSeen } = await start(PUBLIC_URL);

      const res = await initialize(baseUrl, bearer('bad-token'));

      expect(res.status).toBe(401);
      const challenge = res.headers.get('www-authenticate');
      expect(challenge).toContain('Bearer error="invalid_token"');
      expect(challenge).toContain(RESOURCE_METADATA);
      expect(await res.json()).toMatchObject({ jsonrpc: '2.0', error: { code: -32001 }, id: null });
      expect(authSeen).toEqual([]);
    });

    it('answers 503 during an introspection outage and never lets the request through', async () => {
      issueToken('good-token');
      const { baseUrl, authSeen } = await start(PUBLIC_URL);
      backend.state.introspectionDown = true;

      const during = await initialize(baseUrl, bearer('good-token'));

      expect(during.status).toBe(503);
      expect(during.headers.get('www-authenticate')).toBeNull();
      expect(await during.json()).toMatchObject({ jsonrpc: '2.0', error: { code: -32603 } });
      expect(authSeen).toEqual([]);

      backend.state.introspectionDown = false;
      const after = await initialize(baseUrl, bearer('good-token'));
      expect(after.status).toBe(200);
    });

    it('answers 503 for a token it verified before, once the cached result is too old', async () => {
      issueToken('good-token');
      const { baseUrl } = await start(PUBLIC_URL);
      const sessionId = await openSession(baseUrl, bearer('good-token'));

      backend.state.introspectionDown = true;
      nowMs += 60_000;
      const res = await callTool(baseUrl, sessionId, bearer('good-token'), 'echo', {
        message: 'hi',
      });

      expect(res.status).toBe(503);
    });
  });

  describe('verification cache', () => {
    it('trusts a verified token for 60 seconds, then asks the authorization server again', async () => {
      issueToken('long-lived-token');
      const { baseUrl } = await start(PUBLIC_URL);
      const headers = bearer('long-lived-token');
      const sessionId = await openSession(baseUrl, headers);
      expect(backend.state.introspectedTokens).toHaveLength(1);

      nowMs += 59_999;
      const cached = await callTool(baseUrl, sessionId, headers, 'echo', { message: 'hi' });
      expect(cached.status).toBe(200);
      expect(backend.state.introspectedTokens).toHaveLength(1);

      // The token is revoked while its verification is cached.
      backend.state.tokens.set('long-lived-token', { active: false });
      nowMs += 1;
      const revoked = await callTool(baseUrl, sessionId, headers, 'echo', { message: 'hi' });
      expect(revoked.status).toBe(401);
      expect(revoked.challenge).toContain('error="invalid_token"');
      expect(backend.state.introspectedTokens).toHaveLength(2);
    });

    it('stops trusting a cached token the instant it expires', async () => {
      issueToken('short-lived-token', { exp: START_SECONDS + 30 });
      const { baseUrl } = await start(PUBLIC_URL);
      const headers = bearer('short-lived-token');
      const sessionId = await openSession(baseUrl, headers);

      nowMs += 29_999;
      const beforeExpiry = await callTool(baseUrl, sessionId, headers, 'echo', { message: 'hi' });
      expect(beforeExpiry.status).toBe(200);
      expect(backend.state.introspectedTokens).toHaveLength(1);

      nowMs += 1;
      const atExpiry = await callTool(baseUrl, sessionId, headers, 'echo', { message: 'hi' });
      expect(atExpiry.status).toBe(401);
      expect(atExpiry.challenge).toContain('error="invalid_token"');
    });

    it('never caches a refused token', async () => {
      const { baseUrl } = await start(PUBLIC_URL);

      await initialize(baseUrl, bearer('unknown-token'));
      issueToken('unknown-token');
      const res = await initialize(baseUrl, bearer('unknown-token'));

      expect(res.status).toBe(200);
      expect(backend.state.introspectedTokens).toEqual(['unknown-token', 'unknown-token']);
    });
  });

  describe('OAuth tokens only', () => {
    it('does not let the TRANSCEND_API_KEY env fallback authenticate public callers', async () => {
      process.env.TRANSCEND_API_KEY = 'server-side-key-must-be-ignored';
      const { baseUrl, authSeen } = await start(PUBLIC_URL);

      const res = await initialize(baseUrl);

      expect(res.status).toBe(401);
      expect(authSeen).toEqual([]);
    });

    it.each([
      ['an API key header', { [TRANSCEND_API_KEY_HEADER]: TEST_API_KEY }],
      [
        'a session cookie',
        { Cookie: 'laravel_session=abc', [TRANSCEND_ACTIVE_ORG_ID_HEADER]: 'org-uuid-123' },
      ],
      ['a non-Bearer Authorization header', { Authorization: `Basic ${TEST_API_KEY}` }],
    ])('challenges %s without asking the authorization server', async (_label, headers) => {
      const { baseUrl, authSeen } = await start(PUBLIC_URL);

      const res = await initialize(baseUrl, headers);

      expect(res.status).toBe(401);
      expect(res.headers.get('www-authenticate')).toBe(`Bearer ${RESOURCE_METADATA}`);
      expect(backend.state.introspectedTokens).toEqual([]);
      expect(authSeen).toEqual([]);
    });

    it('rejects an API key sent as a Bearer token', async () => {
      const { baseUrl, authSeen } = await start(PUBLIC_URL);

      const res = await initialize(baseUrl, bearer(TEST_API_KEY));

      expect(res.status).toBe(401);
      expect(res.headers.get('www-authenticate')).toContain('error="invalid_token"');
      expect(backend.state.introspectedTokens).toEqual([TEST_API_KEY]);
      expect(authSeen).toEqual([]);
    });

    it('ignores an API key and a cookie sent next to a verified token', async () => {
      issueToken('good-token');
      const { baseUrl, authSeen } = await start(PUBLIC_URL);

      const res = await initialize(baseUrl, {
        ...bearer('good-token'),
        [TRANSCEND_API_KEY_HEADER]: TEST_API_KEY,
        Cookie: 'laravel_session=abc',
        [TRANSCEND_ACTIVE_ORG_ID_HEADER]: 'org-uuid-123',
      });

      expect(res.status).toBe(200);
      expect(authSeen).toEqual([
        { type: 'oauthToken', accessToken: 'good-token', expiresAt: START_MS + 3_600_000 },
      ]);
    });
  });

  describe('session ownership', () => {
    it('keeps a session usable after the same user refreshes the token', async () => {
      issueToken('first-token', { sub: 'alice' });
      issueToken('refreshed-token', { sub: 'alice' });
      const { baseUrl } = await start(PUBLIC_URL);
      const sessionId = await openSession(baseUrl, bearer('first-token'));

      const res = await callTool(baseUrl, sessionId, bearer('refreshed-token'), 'echo', {
        message: 'hi',
      });

      expect(res.status).toBe(200);
    });

    it('binds a session to the exact token when the token names no user', async () => {
      issueToken('first-token', { sub: undefined });
      issueToken('second-token', { sub: undefined });
      const { baseUrl } = await start(PUBLIC_URL);
      const sessionId = await openSession(baseUrl, bearer('first-token'));

      const sameClient = await callTool(baseUrl, sessionId, bearer('second-token'), 'echo', {
        message: 'hi',
      });
      const sameToken = await callTool(baseUrl, sessionId, bearer('first-token'), 'echo', {
        message: 'hi',
      });

      expect(sameClient.status).toBe(400);
      expect(sameToken.status).toBe(200);
    });

    it.each([
      ['another user', { sub: 'bob' }],
      ['another OAuth client', { sub: 'alice', client_id: 'other-client' }],
    ])('hides a session from %s', async (_label, claims) => {
      issueToken('alice-token', { sub: 'alice' });
      issueToken('intruder-token', claims);
      const { baseUrl } = await start(PUBLIC_URL);
      const sessionId = await openSession(baseUrl, bearer('alice-token'));
      const intruderHeaders = { ...bearer('intruder-token'), [MCP_SESSION_ID_HEADER]: sessionId };

      const call = await callTool(baseUrl, sessionId, bearer('intruder-token'), 'echo', {
        message: 'hi',
      });
      expect(call.status).toBe(400);
      for (const method of ['GET', 'DELETE']) {
        const res = await fetch(`${baseUrl}/mcp`, {
          method,
          headers: { ...MCP_HEADERS, ...intruderHeaders },
        });
        expect(res.status, method).toBe(400);
      }

      // The intruder's DELETE did not close the session.
      const owner = await callTool(baseUrl, sessionId, bearer('alice-token'), 'echo', {
        message: 'hi',
      });
      expect(owner.status).toBe(200);
    });
  });

  describe('Sombra tools', () => {
    it('runs a Sombra tool for an organization on the multi-tenant Sombra', async () => {
      issueToken('good-token');
      setOrganization('good-token', { hostedMethod: 'MULTI_TENANT' });
      const { baseUrl } = await start(PUBLIC_URL);
      const sessionId = await openSession(baseUrl, bearer('good-token'));

      const res = await callTool(baseUrl, sessionId, bearer('good-token'), 'sombra_public_key');

      expect(res.text).toContain('sombra-public-key');
      expect(backend.state.sombraCalls).toBe(1);
    });

    it.each([
      ['is self-hosted on premise', { hostedMethod: 'ON_PREMISE' }],
      ['is single tenant', { hostedMethod: 'SINGLE_TENANT' }],
      ['has no hosting type', {}],
    ])('refuses a Sombra tool when the Sombra %s', async (_label, sombra) => {
      issueToken('good-token');
      setOrganization('good-token', sombra);
      const { baseUrl } = await start(PUBLIC_URL);
      const sessionId = await openSession(baseUrl, bearer('good-token'));

      const res = await callTool(baseUrl, sessionId, bearer('good-token'), 'sombra_public_key');

      expect(res.text).toContain('self-hosts Sombra');
      expect(res.text).toContain('npx @transcend-io/mcp');
      expect(backend.state.sombraCalls).toBe(0);
    });

    it('still refuses a multi-tenant organization that disabled MCP × Sombra', async () => {
      issueToken('good-token');
      setOrganization(
        'good-token',
        { hostedMethod: 'MULTI_TENANT' },
        { isAiEnabled: true, isMcpSombraEnabled: false },
      );
      const { baseUrl } = await start(PUBLIC_URL);
      const sessionId = await openSession(baseUrl, bearer('good-token'));

      const res = await callTool(baseUrl, sessionId, bearer('good-token'), 'sombra_public_key');

      expect(res.text).toContain('MCP × Sombra is disabled');
      expect(backend.state.sombraCalls).toBe(0);
    });
  });

  describe('without a public URL', () => {
    it('is unchanged: no metadata, no challenge, env key still works', async () => {
      process.env.TRANSCEND_API_KEY = 'env-key';
      const { baseUrl, authSeen } = await start(undefined);

      const meta = await fetch(`${baseUrl}/.well-known/oauth-protected-resource`);
      expect(meta.status).toBe(404);

      const withEnvKey = await initialize(baseUrl);
      expect(withEnvKey.status).toBe(200);
      expect(withEnvKey.headers.get('www-authenticate')).toBeNull();
      expect(authSeen).toEqual([{ type: 'apiKey', apiKey: 'env-key' }]);

      // Sidecar case: no credentials anywhere still initializes (auth-free handshake).
      delete process.env.TRANSCEND_API_KEY;
      const sidecar = await initialize(baseUrl);
      expect(sidecar.status).toBe(200);
      expect(authSeen[1]).toBeNull();
    });

    it('accepts an API key and never asks the authorization server', async () => {
      const { baseUrl, authSeen } = await start(undefined);

      const res = await initialize(baseUrl, { [TRANSCEND_API_KEY_HEADER]: TEST_API_KEY });

      expect(res.status).toBe(200);
      expect(authSeen).toEqual([{ type: 'apiKey', apiKey: TEST_API_KEY }]);
      expect(backend.state.introspectedTokens).toEqual([]);
    });

    it('runs a Sombra tool for an organization that self-hosts Sombra', async () => {
      setOrganization(TEST_API_KEY, { hostedMethod: 'ON_PREMISE' });
      const { baseUrl } = await start(undefined);
      const headers = { [TRANSCEND_API_KEY_HEADER]: TEST_API_KEY };
      const sessionId = await openSession(baseUrl, headers);

      const res = await callTool(baseUrl, sessionId, headers, 'sombra_public_key');

      expect(res.text).toContain('sombra-public-key');
      expect(backend.state.sombraCalls).toBe(1);
    });
  });
});
