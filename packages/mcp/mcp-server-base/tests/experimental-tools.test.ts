import type { AddressInfo } from 'node:net';

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { MCP_SESSION_ID_HEADER } from '../src/http-header-names.js';
import { experimentalToolsEnabled, TRANSCEND_MCP_EXPERIMENTAL_ENV } from '../src/oauth/env.js';
import { buildMcpServer } from '../src/server/build-server.js';
import type { TransportConfig } from '../src/server/parse-args.js';
import { runMcpHttp, type McpHttpServer } from '../src/server/run-http.js';
import { defineTool, shouldRegisterTool } from '../src/tools/types.js';
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

function parseSseData(text: string): unknown[] {
  return text
    .split('\n')
    .filter((line) => line.startsWith('data: '))
    .map((line) => line.slice(6).trim())
    .filter((payload) => payload !== '')
    .map((payload) => JSON.parse(payload));
}

let nextRequestId = 100;

async function rpc<T>(
  baseUrl: string,
  sessionId: string,
  method: string,
  params?: Record<string, unknown>,
): Promise<T> {
  const id = nextRequestId++;
  const res = await fetch(`${baseUrl}/mcp`, {
    method: 'POST',
    headers: { ...MCP_HEADERS, [MCP_SESSION_ID_HEADER]: sessionId },
    body: JSON.stringify({ jsonrpc: '2.0', method, ...(params && { params }), id }),
  });
  expect(res.status).toBe(200);

  const response = parseSseData(await res.text()).find(
    (entry) => (entry as { id?: number }).id === id,
  ) as { result?: T; error?: { message: string } } | undefined;
  expect(response, `no JSON-RPC response for ${method}`).toBeDefined();
  if (response!.error) {
    throw new Error(response!.error.message);
  }
  return response!.result as T;
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
        clientInfo: { name: 'experimental-tools-test', version: '0.1.0' },
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

const stableTool = defineTool({
  name: 'stable_echo',
  description: 'Stable tool always registered',
  category: 'test',
  readOnly: true,
  requireAuth: false,
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  zodSchema: z.object({}),
  handler: async () => ({ ok: true }),
});

const experimentalTool = defineTool({
  name: 'experimental_echo',
  description: 'Experimental tool gated by env',
  category: 'test',
  readOnly: true,
  requireAuth: false,
  experimental: true,
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  zodSchema: z.object({}),
  handler: async () => ({ ok: true }),
});

describe('experimentalToolsEnabled / shouldRegisterTool', () => {
  const original = process.env[TRANSCEND_MCP_EXPERIMENTAL_ENV];

  afterEach(() => {
    if (original === undefined) delete process.env[TRANSCEND_MCP_EXPERIMENTAL_ENV];
    else process.env[TRANSCEND_MCP_EXPERIMENTAL_ENV] = original;
  });

  it('is off unless the env var is exactly 1', () => {
    delete process.env[TRANSCEND_MCP_EXPERIMENTAL_ENV];
    expect(experimentalToolsEnabled()).toBe(false);

    process.env[TRANSCEND_MCP_EXPERIMENTAL_ENV] = '0';
    expect(experimentalToolsEnabled()).toBe(false);

    process.env[TRANSCEND_MCP_EXPERIMENTAL_ENV] = 'true';
    expect(experimentalToolsEnabled()).toBe(false);

    process.env[TRANSCEND_MCP_EXPERIMENTAL_ENV] = '1';
    expect(experimentalToolsEnabled()).toBe(true);
  });

  it('registers non-experimental tools regardless of the env var', () => {
    delete process.env[TRANSCEND_MCP_EXPERIMENTAL_ENV];
    expect(shouldRegisterTool(stableTool)).toBe(true);

    process.env[TRANSCEND_MCP_EXPERIMENTAL_ENV] = '1';
    expect(shouldRegisterTool(stableTool)).toBe(true);
  });

  it('registers experimental tools only when the env var is 1', () => {
    delete process.env[TRANSCEND_MCP_EXPERIMENTAL_ENV];
    expect(shouldRegisterTool(experimentalTool)).toBe(false);

    process.env[TRANSCEND_MCP_EXPERIMENTAL_ENV] = '1';
    expect(shouldRegisterTool(experimentalTool)).toBe(true);
  });
});

describe('buildMcpServer omits experimental tools by default', () => {
  let httpServer: McpHttpServer;
  let baseUrl: string;
  const original = process.env[TRANSCEND_MCP_EXPERIMENTAL_ENV];

  beforeAll(async () => {
    delete process.env[TRANSCEND_MCP_EXPERIMENTAL_ENV];
    httpServer = await runMcpHttp(
      {
        name: 'experimental-off-test',
        version: '0.0.1',
        createServer: () =>
          buildMcpServer({
            name: 'experimental-off-test',
            version: '0.0.1',
            tools: [stableTool, experimentalTool],
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
    if (original === undefined) delete process.env[TRANSCEND_MCP_EXPERIMENTAL_ENV];
    else process.env[TRANSCEND_MCP_EXPERIMENTAL_ENV] = original;
  });

  it('lists only stable tools and refuses tools/call for experimental ones', async () => {
    const sessionId = await initSession(baseUrl);
    const listed = await rpc<{ tools: Array<{ name: string }> }>(baseUrl, sessionId, 'tools/list');
    expect(listed.tools.map((tool) => tool.name)).toEqual(['stable_echo']);

    const result = await rpc<{ content: Array<{ text: string }>; isError?: boolean }>(
      baseUrl,
      sessionId,
      'tools/call',
      {
        name: 'experimental_echo',
        arguments: {},
      },
    );
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain('Unknown tool: experimental_echo');
  });
});

describe('buildMcpServer loads experimental tools when TRANSCEND_MCP_EXPERIMENTAL=1', () => {
  let httpServer: McpHttpServer;
  let baseUrl: string;
  const original = process.env[TRANSCEND_MCP_EXPERIMENTAL_ENV];

  beforeAll(async () => {
    process.env[TRANSCEND_MCP_EXPERIMENTAL_ENV] = '1';
    httpServer = await runMcpHttp(
      {
        name: 'experimental-on-test',
        version: '0.0.1',
        createServer: () =>
          buildMcpServer({
            name: 'experimental-on-test',
            version: '0.0.1',
            tools: [stableTool, experimentalTool],
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
    if (original === undefined) delete process.env[TRANSCEND_MCP_EXPERIMENTAL_ENV];
    else process.env[TRANSCEND_MCP_EXPERIMENTAL_ENV] = original;
  });

  it('lists and runs experimental tools', async () => {
    const sessionId = await initSession(baseUrl);
    const listed = await rpc<{ tools: Array<{ name: string }> }>(baseUrl, sessionId, 'tools/list');
    expect(listed.tools.map((tool) => tool.name).sort()).toEqual([
      'experimental_echo',
      'stable_echo',
    ]);

    const result = await rpc<{ content: Array<{ text: string }> }>(
      baseUrl,
      sessionId,
      'tools/call',
      {
        name: 'experimental_echo',
        arguments: {},
      },
    );
    expect(result.content[0]?.text).toContain('ok');
  });
});
