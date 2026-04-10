import type { AddressInfo } from 'node:net';

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

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
        createServer: () =>
          buildMcpServer({ name: 'test-server', version: '0.0.1', tools: [echoTool] }),
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
      sessionId = res.headers.get('mcp-session-id')!;
      expect(sessionId).toBeTruthy();
    });

    it('sends initialized notification', async () => {
      const res = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          ...MCP_HEADERS,
          'mcp-session-id': sessionId,
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
          'mcp-session-id': sessionId,
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
          'mcp-session-id': sessionId,
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
          'mcp-session-id': sessionId,
        },
      });
      expect(res.status).toBe(200);

      // Subsequent request with old session ID should fail
      const res2 = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          ...MCP_HEADERS,
          'mcp-session-id': sessionId,
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
      expect(res.headers.get('mcp-session-id')).toBeTruthy();
    });

    it('accepts API key from X-Transcend-Api-Key header', async () => {
      const res = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          ...MCP_HEADERS,
          'X-Transcend-Api-Key': TEST_API_KEY,
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
      expect(res.headers.get('mcp-session-id')).toBeTruthy();
    });
  });
});
