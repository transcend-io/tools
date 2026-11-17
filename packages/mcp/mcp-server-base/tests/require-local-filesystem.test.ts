import { describe, expect, it } from 'vitest';

import { buildMcpServer } from '../src/server/build-server.js';
import { defineTool, isAvailableOnTransport } from '../src/tools/types.js';
import { z } from '../src/validation/index.js';

const annotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true };

const plainTool = defineTool({
  name: 'plain_echo',
  description: 'Runs on every transport',
  category: 'test',
  readOnly: true,
  requireAuth: false,
  annotations,
  zodSchema: z.object({}),
  handler: async () => ({ ok: true }),
});

const diskTool = defineTool({
  name: 'disk_echo',
  description: 'Needs a local filesystem',
  category: 'test',
  readOnly: true,
  requireAuth: false,
  requireLocalFilesystem: true,
  annotations,
  zodSchema: z.object({}),
  handler: async () => ({ ok: true }),
});

describe('isAvailableOnTransport', () => {
  it('keeps filesystem tools on stdio', () => {
    expect(isAvailableOnTransport(diskTool, 'stdio')).toBe(true);
  });

  it('drops filesystem tools over http', () => {
    expect(isAvailableOnTransport(diskTool, 'http')).toBe(false);
  });

  it('keeps ordinary tools on both transports', () => {
    expect(isAvailableOnTransport(plainTool, 'stdio')).toBe(true);
    expect(isAvailableOnTransport(plainTool, 'http')).toBe(true);
  });
});

describe('buildMcpServer with requireLocalFilesystem', () => {
  /** Reads the registered tool names through the server's list handler. */
  async function listedNames(transport: 'stdio' | 'http'): Promise<string[]> {
    const server = buildMcpServer({
      name: 'test',
      version: '0.0.0',
      tools: [plainTool, diskTool],
      transport,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handlers = (server as any)._requestHandlers as Map<
      string,
      (request: unknown, extra: unknown) => Promise<{ tools: Array<{ name: string }> }>
    >;
    const list = handlers.get('tools/list')!;
    const result = await list({ method: 'tools/list', params: {} }, {});
    return result.tools.map((tool) => tool.name);
  }

  it('lists the tool over stdio', async () => {
    expect(await listedNames('stdio')).toEqual(['plain_echo', 'disk_echo']);
  });

  it('omits the tool over http', async () => {
    expect(await listedNames('http')).toEqual(['plain_echo']);
  });
});
