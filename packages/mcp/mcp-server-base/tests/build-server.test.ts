import type { AddressInfo } from 'node:net';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { MCP_SESSION_ID_HEADER } from '../src/http-header-names.js';
import * as lazyAuth from '../src/oauth/lazy-auth.js';
import { buildMcpServer } from '../src/server/build-server.js';
import type { TransportConfig } from '../src/server/parse-args.js';
import { runMcpHttp, type McpHttpServer } from '../src/server/run-http.js';
import type { ToolDefinition } from '../src/tools/types.js';
import { z } from '../src/validation/index.js';

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

async function initSession(baseUrl: string): Promise<string> {
  const res = await fetch(`${baseUrl}/mcp`, {
    method: 'POST',
    headers: MCP_HEADERS,
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        protocolVersion: '2025-11-25',
        capabilities: {},
        clientInfo: { name: 'build-server-test', version: '0.1.0' },
      },
      id: 1,
    }),
  });
  expect(res.status).toBe(200);
  const sessionId = res.headers.get(MCP_SESSION_ID_HEADER)!;
  expect(sessionId).toBeTruthy();

  await fetch(`${baseUrl}/mcp`, {
    method: 'POST',
    headers: { ...MCP_HEADERS, [MCP_SESSION_ID_HEADER]: sessionId },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'notifications/initialized',
    }),
  });

  return sessionId;
}

async function callTool(
  baseUrl: string,
  sessionId: string,
  toolName: string,
  requestId: number,
): Promise<void> {
  const res = await fetch(`${baseUrl}/mcp`, {
    method: 'POST',
    headers: { ...MCP_HEADERS, [MCP_SESSION_ID_HEADER]: sessionId },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: toolName, arguments: {} },
      id: requestId,
    }),
  });
  expect(res.status).toBe(200);
  await res.text();
}

const publicTool: ToolDefinition = {
  name: 'public_echo',
  description: 'Public tool that does not require auth',
  category: 'test',
  readOnly: true,
  requireAuth: false,
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  zodSchema: z.object({}),
  handler: async () => ({ ok: true }),
};

const protectedTool: ToolDefinition = {
  name: 'protected_echo',
  description: 'Protected tool that requires auth',
  category: 'test',
  readOnly: true,
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  zodSchema: z.object({}),
  handler: async () => ({ ok: true }),
};

describe('buildMcpServer per-tool requireAuth', () => {
  let httpServer: McpHttpServer;
  let baseUrl: string;
  let ensureLazyOAuthAuthSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(async () => {
    delete process.env.TRANSCEND_API_KEY;
    process.env.TRANSCEND_OAUTH_ISSUER = 'https://yo.com:4001';
    process.env.TRANSCEND_OAUTH_CLIENT_ID = 'client-abc';
    process.env.TRANSCEND_OAUTH_CLIENT_SECRET = 'secret';
    process.env.TRANSCEND_OAUTH_REDIRECT_PORT = '4567';

    httpServer = await runMcpHttp(
      {
        name: 'build-server-test',
        version: '0.0.1',
        createServer: () =>
          buildMcpServer({
            name: 'build-server-test',
            version: '0.0.1',
            tools: [publicTool, protectedTool],
          }),
      },
      testConfig(0),
    );

    const addr = httpServer.httpServer.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    await httpServer.shutdown();
    delete process.env.TRANSCEND_OAUTH_ISSUER;
    delete process.env.TRANSCEND_OAUTH_CLIENT_ID;
    delete process.env.TRANSCEND_OAUTH_CLIENT_SECRET;
    delete process.env.TRANSCEND_OAUTH_REDIRECT_PORT;
  });

  beforeEach(() => {
    ensureLazyOAuthAuthSpy = vi.spyOn(lazyAuth, 'ensureLazyOAuthAuth').mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('skips lazy OAuth for tools with requireAuth: false', async () => {
    const sessionId = await initSession(baseUrl);
    await callTool(baseUrl, sessionId, 'public_echo', 2);
    expect(ensureLazyOAuthAuthSpy).not.toHaveBeenCalled();
  });

  it('runs lazy OAuth for tools that require auth', async () => {
    const sessionId = await initSession(baseUrl);
    await callTool(baseUrl, sessionId, 'protected_echo', 3);
    expect(ensureLazyOAuthAuthSpy).toHaveBeenCalledTimes(1);
  });
});

describe('buildMcpServer MCP App resources', () => {
  let httpServer: McpHttpServer;
  let baseUrl: string;

  const appTool: ToolDefinition = {
    ...publicTool,
    name: 'hello_world',
    description: 'Hello world MCP App demo tool',
    _meta: { ui: { resourceUri: 'ui://test/hello.html' } },
  };

  beforeAll(async () => {
    httpServer = await runMcpHttp(
      {
        name: 'resources-test',
        version: '0.0.1',
        createServer: () =>
          buildMcpServer({
            name: 'resources-test',
            version: '0.0.1',
            tools: [appTool],
            resources: [
              {
                uri: 'ui://test/hello.html',
                name: 'Hello',
                mimeType: 'text/html;profile=mcp-app',
                read: async () => ({ text: '<html><body>Hello</body></html>' }),
              },
            ],
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

  it('advertises resources capability and serves UI resource', async () => {
    const sessionId = await initSession(baseUrl);

    const listRes = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { ...MCP_HEADERS, [MCP_SESSION_ID_HEADER]: sessionId },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'resources/list',
        params: {},
        id: 2,
      }),
    });
    expect(listRes.status).toBe(200);
    const listText = await listRes.text();
    expect(listText).toContain('ui://test/hello.html');

    const readRes = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { ...MCP_HEADERS, [MCP_SESSION_ID_HEADER]: sessionId },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'resources/read',
        params: { uri: 'ui://test/hello.html' },
        id: 3,
      }),
    });
    expect(readRes.status).toBe(200);
    const readText = await readRes.text();
    expect(readText).toContain('text/html;profile=mcp-app');
    expect(readText).toContain('<html><body>Hello</body></html>');
  });

  it('includes ui resourceUri meta on tools/list', async () => {
    const sessionId = await initSession(baseUrl);
    const res = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { ...MCP_HEADERS, [MCP_SESSION_ID_HEADER]: sessionId },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/list',
        params: {},
        id: 4,
      }),
    });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('ui://test/hello.html');
    expect(text).toContain('ui/resourceUri');
  });
});

describe('buildMcpServer instructions', () => {
  let httpServer: McpHttpServer;
  let baseUrl: string;

  beforeAll(async () => {
    httpServer = await runMcpHttp(
      {
        name: 'instructions-test',
        version: '0.0.1',
        createServer: () =>
          buildMcpServer({
            name: 'instructions-test',
            version: '0.0.1',
            tools: [publicTool],
            instructions: 'Call docs_list before API tools.',
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

  it('returns instructions in the initialize response', async () => {
    const res = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: MCP_HEADERS,
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          protocolVersion: '2025-11-25',
          capabilities: {},
          clientInfo: { name: 'instructions-test', version: '0.1.0' },
        },
        id: 1,
      }),
    });

    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('Call docs_list before API tools.');
  });
});
