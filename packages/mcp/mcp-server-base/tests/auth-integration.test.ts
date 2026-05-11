import {
  createServer as createHttpServer,
  type IncomingHttpHeaders,
  type Server as NodeHttpServer,
} from 'node:http';
import type { AddressInfo } from 'node:net';

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

import { TranscendGraphQLBase } from '../src/clients/graphql/base.js';
import { buildMcpServer } from '../src/server/build-server.js';
import type { TransportConfig } from '../src/server/parse-args.js';
import { runMcpHttp, type McpHttpServer } from '../src/server/run-http.js';
import type { ToolDefinition } from '../src/tools/types.js';
import { z } from '../src/validation/index.js';

// ── Helpers ──────────────────────────────────────────────────────────────

const MCP_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'text/event-stream, application/json',
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

function parseSseData(text: string): unknown[] {
  return text
    .split('\n')
    .filter((l) => l.startsWith('data: '))
    .map((l) => JSON.parse(l.slice(6)));
}

// ── Mock backend that records inbound request headers ────────────────────

interface CapturedRequest {
  /** Request URL path */
  url: string;
  /** HTTP method */
  method: string;
  /** Lowercased request headers */
  headers: IncomingHttpHeaders;
}

let capturedRequests: CapturedRequest[] = [];

function createMockBackend(): Promise<{
  /** Mock backend HTTP server */
  server: NodeHttpServer;
  /** Base URL of the mock backend */
  url: string;
}> {
  return new Promise((resolve) => {
    const server = createHttpServer((req, res) => {
      capturedRequests.push({
        url: req.url || '',
        method: req.method || '',
        headers: { ...req.headers },
      });

      let body = '';
      req.on('data', (chunk: Buffer) => {
        body += chunk;
      });
      req.on('end', () => {
        void body;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ data: { __typename: 'Query' } }));
      });
    });

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as AddressInfo;
      resolve({ server, url: `http://127.0.0.1:${addr.port}` });
    });
  });
}

// ── Tool factory ─────────────────────────────────────────────────────────

function makeGraphqlPingTool(graphql: TranscendGraphQLBase): ToolDefinition {
  return {
    name: 'graphql_ping',
    description: 'Calls the GraphQL backend to verify outbound auth headers',
    category: 'test',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: z.object({}),
    handler: async () => {
      await graphql.makeRequest('query { __typename }');
      return { ok: true };
    },
  };
}

// ── MCP session helpers ──────────────────────────────────────────────────

async function initSession(
  baseUrl: string,
  extraHeaders?: Record<string, string>,
): Promise<string> {
  const res = await fetch(`${baseUrl}/mcp`, {
    method: 'POST',
    headers: { ...MCP_HEADERS, ...extraHeaders },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        protocolVersion: '2025-11-25',
        capabilities: {},
        clientInfo: { name: 'auth-integration-test', version: '0.1.0' },
      },
      id: 1,
    }),
  });
  expect(res.status).toBe(200);
  const sessionId = res.headers.get('mcp-session-id')!;
  expect(sessionId).toBeTruthy();

  await fetch(`${baseUrl}/mcp`, {
    method: 'POST',
    headers: { ...MCP_HEADERS, 'mcp-session-id': sessionId },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'notifications/initialized',
    }),
  });

  return sessionId;
}

interface ToolCallResult {
  /** Parsed JSON content from the tool response */
  content: any;
  /** Whether the MCP response flagged this as an error */
  isError: boolean;
}

async function callTool(
  baseUrl: string,
  sessionId: string,
  toolName: string,
  args: Record<string, unknown>,
  extraHeaders?: Record<string, string>,
  requestId: number = 2,
): Promise<ToolCallResult> {
  const res = await fetch(`${baseUrl}/mcp`, {
    method: 'POST',
    headers: {
      ...MCP_HEADERS,
      'mcp-session-id': sessionId,
      ...extraHeaders,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: toolName, arguments: args },
      id: requestId,
    }),
  });

  expect(res.status).toBe(200);
  const text = await res.text();
  const dataLines = parseSseData(text);
  const callResponse = dataLines.find((d: any) => d.id === requestId) as any;
  expect(callResponse).toBeDefined();

  const content = JSON.parse(callResponse.result.content[0].text);
  return { content, isError: !!callResponse.result.isError };
}

// ── Shared server factory ────────────────────────────────────────────────

type McpHttpServerOptions = Parameters<typeof runMcpHttp>[0];

function mcpServerFactory(mockBackendUrl: string): McpHttpServerOptions['createServer'] {
  return (auth) => {
    const graphql = new TranscendGraphQLBase(auth, mockBackendUrl);
    return buildMcpServer({
      name: 'auth-integration-test',
      version: '0.0.1',
      tools: [makeGraphqlPingTool(graphql)],
    });
  };
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('Auth Integration (HTTP transport → client → outbound fetch)', () => {
  let mockBackend: NodeHttpServer;
  let mockBackendUrl: string;
  let savedApiKey: string | undefined;

  beforeAll(async () => {
    savedApiKey = process.env.TRANSCEND_API_KEY;
    const backend = await createMockBackend();
    mockBackend = backend.server;
    mockBackendUrl = backend.url;
  });

  afterAll(async () => {
    if (savedApiKey !== undefined) {
      process.env.TRANSCEND_API_KEY = savedApiKey;
    } else {
      delete process.env.TRANSCEND_API_KEY;
    }
    await new Promise<void>((resolve) => mockBackend.close(() => resolve()));
  });

  beforeEach(() => {
    capturedRequests = [];
  });

  // ── Server with env var set (startup key + override scenarios) ──────

  describe('with TRANSCEND_API_KEY set', () => {
    let mcpServer: McpHttpServer;
    let mcpUrl: string;

    beforeAll(async () => {
      process.env.TRANSCEND_API_KEY = 'startup-api-key-12345';

      mcpServer = await runMcpHttp(
        {
          name: 'auth-env-var-test',
          version: '0.0.1',
          createServer: mcpServerFactory(mockBackendUrl),
        },
        testConfig(0),
      );

      const addr = mcpServer.httpServer.address() as AddressInfo;
      mcpUrl = `http://127.0.0.1:${addr.port}`;
    });

    afterAll(async () => {
      await mcpServer.shutdown();
    });

    it('uses startup API key when no per-request headers are sent', async () => {
      const sessionId = await initSession(mcpUrl);
      capturedRequests = [];

      const { content, isError } = await callTool(mcpUrl, sessionId, 'graphql_ping', {});

      expect(isError).toBe(false);
      expect(content.ok).toBe(true);

      const gqlReq = capturedRequests.find((r) => r.url === '/graphql');
      expect(gqlReq).toBeDefined();
      expect(gqlReq!.headers.authorization).toBe('Bearer startup-api-key-12345');
      expect(gqlReq!.headers['x-transcend-active-organization-id']).toBeUndefined();
      expect(gqlReq!.headers['user-agent']).toBe('Transcend-mcp');
      const toolCallId = gqlReq!.headers['x-toolcall-id'] as string;
      expect(toolCallId).toMatch(/^graphql_ping:/);
      expect(toolCallId!.slice('graphql_ping:'.length)).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('per-request API key overrides the env var key', async () => {
      const sessionId = await initSession(mcpUrl);
      capturedRequests = [];

      const { isError } = await callTool(
        mcpUrl,
        sessionId,
        'graphql_ping',
        {},
        {
          Authorization: 'Bearer override-key',
        },
      );

      expect(isError).toBe(false);

      const gqlReq = capturedRequests.find((r) => r.url === '/graphql');
      expect(gqlReq).toBeDefined();
      expect(gqlReq!.headers.authorization).toBe('Bearer override-key');
    });

    it('per-request session cookie overrides the env var key', async () => {
      const sessionId = await initSession(mcpUrl);
      capturedRequests = [];

      const { isError } = await callTool(
        mcpUrl,
        sessionId,
        'graphql_ping',
        {},
        {
          Cookie: 'laravel_session=override-cookie',
          'x-transcend-active-organization-id': 'override-org',
        },
      );

      expect(isError).toBe(false);

      const gqlReq = capturedRequests.find((r) => r.url === '/graphql');
      expect(gqlReq).toBeDefined();
      expect(gqlReq!.headers.cookie).toBe('laravel_session=override-cookie');
      expect(gqlReq!.headers['x-transcend-active-organization-id']).toBe('override-org');
      expect(gqlReq!.headers.authorization).toBeUndefined();
    });

    it('session cookie takes priority when both cookie and API key headers are sent', async () => {
      const sessionId = await initSession(mcpUrl);
      capturedRequests = [];

      const { isError } = await callTool(
        mcpUrl,
        sessionId,
        'graphql_ping',
        {},
        {
          Cookie: 'laravel_session=priority-cookie',
          'x-transcend-active-organization-id': 'org-priority',
          Authorization: 'Bearer should-be-ignored',
        },
      );

      expect(isError).toBe(false);

      const gqlReq = capturedRequests.find((r) => r.url === '/graphql');
      expect(gqlReq).toBeDefined();
      expect(gqlReq!.headers.cookie).toBe('laravel_session=priority-cookie');
      expect(gqlReq!.headers['x-transcend-active-organization-id']).toBe('org-priority');
      expect(gqlReq!.headers.authorization).toBeUndefined();
    });
  });

  // ── Server without env var (auth-free init / error paths) ──────────

  describe('without TRANSCEND_API_KEY (sidecar pattern)', () => {
    let mcpServer: McpHttpServer;
    let mcpUrl: string;

    beforeAll(async () => {
      delete process.env.TRANSCEND_API_KEY;

      mcpServer = await runMcpHttp(
        {
          name: 'auth-no-env-var-test',
          version: '0.0.1',
          createServer: mcpServerFactory(mockBackendUrl),
        },
        testConfig(0),
      );

      const addr = mcpServer.httpServer.address() as AddressInfo;
      mcpUrl = `http://127.0.0.1:${addr.port}`;
    });

    afterAll(async () => {
      await mcpServer.shutdown();
    });

    it('returns AUTH_ERROR when no auth is available anywhere', async () => {
      const sessionId = await initSession(mcpUrl);

      const { content, isError } = await callTool(mcpUrl, sessionId, 'graphql_ping', {});

      expect(isError).toBe(true);
      expect(content.success).toBe(false);
      expect(content.error).toMatch(/No authentication configured/);
      expect(content.code).toBe('AUTH_ERROR');
      expect(content.retryable).toBe(false);
    });

    it('makes no outbound requests when auth is missing', async () => {
      const sessionId = await initSession(mcpUrl);
      capturedRequests = [];

      await callTool(mcpUrl, sessionId, 'graphql_ping', {});

      expect(capturedRequests).toHaveLength(0);
    });
  });
});
