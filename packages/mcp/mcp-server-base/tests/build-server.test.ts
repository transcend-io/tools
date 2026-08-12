import type { AddressInfo } from 'node:net';

import type { ClientCapabilities } from '@modelcontextprotocol/sdk/types.js';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { McpClientCapability } from '../src/capabilities/types.js';
import { MCP_SESSION_ID_HEADER } from '../src/http-header-names.js';
import * as lazyAuth from '../src/oauth/lazy-auth.js';
import { buildMcpServer } from '../src/server/build-server.js';
import type { TransportConfig } from '../src/server/parse-args.js';
import { runMcpHttp, type McpHttpServer } from '../src/server/run-http.js';
import { defineToolWithCapabilities } from '../src/tools/define-tool-with-capabilities.js';
import { defineTool, type ToolDefinition } from '../src/tools/types.js';
import {
  defineUiResource,
  MCP_APP_MIME_TYPE,
  MCP_UI_EXTENSION_ID,
} from '../src/tools/ui-resource.js';
import { z } from '../src/validation/index.js';

const MCP_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'text/event-stream, application/json',
};

/** MCP Apps capability declaration a host sends to opt into `ui://` rendering. */
const MCP_APP_CAPABILITIES: ClientCapabilities = {
  extensions: { [MCP_UI_EXTENSION_ID]: { mimeTypes: [MCP_APP_MIME_TYPE] } },
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
  return (
    text
      .split('\n')
      .filter((line) => line.startsWith('data: '))
      .map((line) => line.slice(6).trim())
      // Keep-alive frames carry an empty payload; only decode real messages.
      .filter((payload) => payload !== '')
      .map((payload) => JSON.parse(payload))
  );
}

/** Performs the initialize handshake and returns the negotiated server capabilities. */
async function initializeAndGetServerCapabilities(
  baseUrl: string,
  clientName: string,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${baseUrl}/mcp`, {
    method: 'POST',
    headers: MCP_HEADERS,
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        protocolVersion: '2025-11-25',
        capabilities: {},
        clientInfo: { name: clientName, version: '0.1.0' },
      },
      id: 1,
    }),
  });
  expect(res.status).toBe(200);

  const payload = parseSseData(await res.text()).find(
    (entry) => (entry as { id?: number }).id === 1,
  ) as { result: { capabilities: Record<string, unknown> } } | undefined;
  expect(payload, 'no initialize response').toBeDefined();
  return payload!.result.capabilities;
}

let nextRequestId = 100;

/** Sends a JSON-RPC request on an established session and returns its result. */
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

async function initSession(
  baseUrl: string,
  options: {
    /** Capabilities the simulated host declares */
    capabilities?: ClientCapabilities;
    /** Client name the simulated host reports */
    clientName?: string;
  } = {},
): Promise<string> {
  const res = await fetch(`${baseUrl}/mcp`, {
    method: 'POST',
    headers: MCP_HEADERS,
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        protocolVersion: '2025-11-25',
        capabilities: options.capabilities ?? {},
        clientInfo: { name: options.clientName ?? 'build-server-test', version: '0.1.0' },
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

const sombraTool: ToolDefinition = {
  name: 'sombra_echo',
  description: 'Tool that requires Sombra',
  category: 'test',
  readOnly: true,
  requireAuth: false,
  requireSombra: true,
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  zodSchema: z.object({}),
  handler: async () => ({ ok: true }),
};

describe('buildMcpServer requireSombra ListTools meta', () => {
  let httpServer: McpHttpServer;
  let baseUrl: string;

  beforeAll(async () => {
    httpServer = await runMcpHttp(
      {
        name: 'require-sombra-test',
        version: '0.0.1',
        createServer: () =>
          buildMcpServer({
            name: 'require-sombra-test',
            version: '0.0.1',
            tools: [publicTool, sombraTool],
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

  it('emits _meta.requireSombra only for tools marked requireSombra: true', async () => {
    const sessionId = await initSession(baseUrl);
    const res = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { ...MCP_HEADERS, [MCP_SESSION_ID_HEADER]: sessionId },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/list',
        params: {},
        id: 2,
      }),
    });
    expect(res.status).toBe(200);
    const text = await res.text();
    // SSE or JSON body — parse JSON-RPC result payload from the response text
    const jsonMatch = text.match(/\{[\s\S]*"result"[\s\S]*\}/);
    expect(jsonMatch).toBeTruthy();
    const payload = JSON.parse(jsonMatch![0]!) as {
      result: {
        tools: Array<{ name: string; _meta?: { requireSombra?: boolean } }>;
      };
    };
    const byName = Object.fromEntries(payload.result.tools.map((t) => [t.name, t]));
    expect(byName.public_echo?._meta?.requireSombra).toBeUndefined();
    expect(byName.sombra_echo?._meta?.requireSombra).toBe(true);
  });
});

// ── MCP Apps and capability-aware tools ──────────────────────────────────

const testView = defineUiResource({
  uri: 'ui://build-server-test/view',
  name: 'Build server test view',
  description: 'View used to exercise the resources handlers.',
  html: '<!DOCTYPE html><html><body>hello</body></html>',
  prefersBorder: false,
});

function capabilityAwareTool(): ToolDefinition {
  return defineToolWithCapabilities({
    name: 'greet',
    description: 'Greet someone, adapting to the capabilities of the connected host.',
    category: 'test',
    readOnly: true,
    requireAuth: false,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: z.object({}),
    handler: async () => ({ via: 'baseline' }),
    variants: {
      [McpClientCapability.McpApp]: {
        resource: testView,
        handler: async () => ({ via: 'mcp-app' }),
        appOnlyTools: [
          defineTool({
            name: 'greet_refresh',
            description: 'Refresh the greeting payload for the greet view.',
            category: 'test',
            readOnly: true,
            requireAuth: false,
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
            zodSchema: z.object({}),
            handler: async () => ({ via: 'refresh' }),
          }),
        ],
      },
    },
  });
}

interface ListedTool {
  /** Tool name */
  name: string;
  /** Extension metadata, including the MCP Apps view binding */
  _meta?: Record<string, unknown>;
}

describe('buildMcpServer without UI resources', () => {
  let httpServer: McpHttpServer;
  let baseUrl: string;

  beforeAll(async () => {
    httpServer = await runMcpHttp(
      {
        name: 'no-ui-test',
        version: '0.0.1',
        createServer: () =>
          buildMcpServer({
            name: 'no-ui-test',
            version: '0.0.1',
            tools: [publicTool],
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

  it('does not advertise the resources capability', async () => {
    const capabilities = await initializeAndGetServerCapabilities(baseUrl, 'no-ui-test');
    expect(capabilities.tools).toBeDefined();
    expect(capabilities.resources).toBeUndefined();
  });

  it('rejects resources/list, since the handler was never registered', async () => {
    const sessionId = await initSession(baseUrl);
    await expect(rpc(baseUrl, sessionId, 'resources/list')).rejects.toThrow();
  });
});

describe('buildMcpServer MCP Apps', () => {
  let httpServer: McpHttpServer;
  let baseUrl: string;

  beforeAll(async () => {
    httpServer = await runMcpHttp(
      {
        name: 'ui-test',
        version: '0.0.1',
        createServer: () =>
          buildMcpServer({
            name: 'ui-test',
            version: '0.0.1',
            tools: [publicTool, capabilityAwareTool()],
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

  it('advertises the resources capability when a tool binds a view', async () => {
    const capabilities = await initializeAndGetServerCapabilities(baseUrl, 'ui-test');
    expect(capabilities.resources).toBeDefined();
  });

  it('lists the ui:// resource with the MCP App mime type', async () => {
    const sessionId = await initSession(baseUrl, { capabilities: MCP_APP_CAPABILITIES });
    const result = await rpc<{
      resources: { uri: string; name: string; mimeType: string; description?: string }[];
    }>(baseUrl, sessionId, 'resources/list');

    expect(result.resources).toHaveLength(1);
    expect(result.resources[0]).toMatchObject({
      uri: 'ui://build-server-test/view',
      mimeType: MCP_APP_MIME_TYPE,
      description: 'View used to exercise the resources handlers.',
    });
  });

  it('serves the view HTML and its rendering metadata on resources/read', async () => {
    const sessionId = await initSession(baseUrl, { capabilities: MCP_APP_CAPABILITIES });
    const result = await rpc<{
      contents: { uri: string; mimeType: string; text: string; _meta?: unknown }[];
    }>(baseUrl, sessionId, 'resources/read', { uri: 'ui://build-server-test/view' });

    expect(result.contents).toHaveLength(1);
    expect(result.contents[0]!.mimeType).toBe(MCP_APP_MIME_TYPE);
    expect(result.contents[0]!.text).toContain('<!DOCTYPE html>');
    expect(result.contents[0]!._meta).toEqual({ ui: { prefersBorder: false } });
  });

  it('reports a helpful error for an unknown resource uri', async () => {
    const sessionId = await initSession(baseUrl, { capabilities: MCP_APP_CAPABILITIES });
    await expect(
      rpc(baseUrl, sessionId, 'resources/read', { uri: 'ui://build-server-test/missing' }),
    ).rejects.toThrow(/Unknown resource uri/);
  });

  it('serves the baseline variant and no view metadata to a host without MCP Apps', async () => {
    const sessionId = await initSession(baseUrl);
    const listed = await rpc<{ tools: ListedTool[] }>(baseUrl, sessionId, 'tools/list');

    expect(listed.tools.map((tool) => tool.name).sort()).toEqual(['greet', 'public_echo']);
    expect(listed.tools.find((tool) => tool.name === 'greet')!._meta).toBeUndefined();

    const called = await rpc<{ content: { text: string }[] }>(baseUrl, sessionId, 'tools/call', {
      name: 'greet',
      arguments: {},
    });
    expect(JSON.parse(called.content[0]!.text)).toEqual({ via: 'baseline' });
  });

  it('serves the MCP App variant with view metadata to a host that supports it', async () => {
    const sessionId = await initSession(baseUrl, {
      capabilities: MCP_APP_CAPABILITIES,
      clientName: 'claude-ai',
    });
    const listed = await rpc<{ tools: ListedTool[] }>(baseUrl, sessionId, 'tools/list');

    const greet = listed.tools.find((tool) => tool.name === 'greet')!;
    expect(greet._meta).toEqual({
      ui: { resourceUri: 'ui://build-server-test/view' },
      'ui/resourceUri': 'ui://build-server-test/view',
    });

    const called = await rpc<{ content: { text: string }[] }>(baseUrl, sessionId, 'tools/call', {
      name: 'greet',
      arguments: {},
    });
    expect(JSON.parse(called.content[0]!.text)).toEqual({ via: 'mcp-app' });
  });

  it('hides app-only companions from tools/list but keeps them callable', async () => {
    const sessionId = await initSession(baseUrl, { capabilities: MCP_APP_CAPABILITIES });
    const listed = await rpc<{ tools: ListedTool[] }>(baseUrl, sessionId, 'tools/list');
    expect(listed.tools.map((tool) => tool.name)).not.toContain('greet_refresh');

    const called = await rpc<{ content: { text: string }[] }>(baseUrl, sessionId, 'tools/call', {
      name: 'greet_refresh',
      arguments: {},
    });
    expect(JSON.parse(called.content[0]!.text)).toEqual({ via: 'refresh' });
  });

  it('does not expose companions to a host without MCP Apps', async () => {
    const sessionId = await initSession(baseUrl);
    const called = await rpc<{ content: { text: string }[]; isError?: boolean }>(
      baseUrl,
      sessionId,
      'tools/call',
      { name: 'greet_refresh', arguments: {} },
    );
    expect(called.isError).toBe(true);
    expect(called.content[0]!.text).toContain('Unknown tool');
  });
});
