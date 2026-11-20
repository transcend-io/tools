import { describe, it, expect, beforeAll } from 'vitest';

import { buildMcpServer } from '../src/server/build-server.js';
import { createWebMcpHandler } from '../src/server/create-web-mcp-handler.js';
import { McpTransport } from '../src/server/transport.js';
import type { ToolDefinition } from '../src/tools/types.js';
import { z } from '../src/validation/index.js';

const MCP_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json, text/event-stream',
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

describe('createWebMcpHandler (stateless)', () => {
  let handler: (request: Request) => Promise<Response>;

  beforeAll(() => {
    handler = createWebMcpHandler({
      name: 'test-web-server',
      version: '0.0.1',
      createServer: () =>
        buildMcpServer({
          name: 'test-web-server',
          version: '0.0.1',
          tools: [echoTool],
          transport: McpTransport.Http,
        }),
    });
  });

  it('handles initialize on a fresh stateless request', async () => {
    const res = await handler(
      new Request('http://localhost/mcp', {
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
      }),
    );

    expect(res.status).toBe(200);
    const contentType = res.headers.get('content-type') ?? '';
    const body = contentType.includes('json')
      ? await res.json()
      : JSON.parse(
          (await res.text())
            .split('\n')
            .find((line) => line.startsWith('data: '))
            ?.slice(6) ?? '{}',
        );
    expect(body.result.serverInfo.name).toBe('test-web-server');
    expect(res.headers.get('mcp-session-id')).toBeNull();
  });

  it('accepts a second initialize on another stateless request', async () => {
    const initBody = {
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        protocolVersion: '2025-11-25',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '0.1.0' },
      },
      id: 1,
    };

    const first = await handler(
      new Request('http://localhost/mcp', {
        method: 'POST',
        headers: MCP_HEADERS,
        body: JSON.stringify(initBody),
      }),
    );
    const second = await handler(
      new Request('http://localhost/mcp', {
        method: 'POST',
        headers: MCP_HEADERS,
        body: JSON.stringify(initBody),
      }),
    );

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
  });
});
