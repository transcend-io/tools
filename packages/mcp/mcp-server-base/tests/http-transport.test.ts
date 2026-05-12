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
