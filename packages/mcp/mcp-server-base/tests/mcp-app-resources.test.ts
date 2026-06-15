import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { describe, expect, it } from 'vitest';

import { defineTool, z } from '../src/index.js';
import { buildMcpServer } from '../src/server/build-server.js';
import { MCP_APP_RESOURCE_MIME_TYPE } from '../src/server/mcp-app-mime.js';

const RESOURCE_URI = 'ui://test/create-form';

describe('MCP App resources', () => {
  it('includes _meta.ui.resourceUri in tools/list for UI tools', async () => {
    const server = buildMcpServer({
      name: 'test',
      version: '0.0.1',
      tools: [
        defineTool({
          name: 'ui_tool',
          description: 'Tool with UI',
          category: 'test',
          readOnly: true,
          annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
          zodSchema: z.object({}),
          ui: { resourceUri: RESOURCE_URI },
          handler: async () => ({ ok: true }),
        }),
      ],
      resources: [
        {
          uri: RESOURCE_URI,
          name: 'Create Form',
          loadHtml: async () => '<html><body>form</body></html>',
        },
      ],
    });

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test-client', version: '0.0.1' });
    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const { tools } = await client.listTools();
    const uiTool = tools.find((t) => t.name === 'ui_tool');
    expect(uiTool?._meta).toEqual({ ui: { resourceUri: RESOURCE_URI } });
  });

  it('lists internal tools with app-only visibility but keeps them callable', async () => {
    const server = buildMcpServer({
      name: 'test',
      version: '0.0.1',
      tools: [
        defineTool({
          name: 'public_tool',
          description: 'Public tool',
          category: 'test',
          readOnly: true,
          annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
          zodSchema: z.object({}),
          handler: async () => ({ ok: true }),
        }),
        defineTool({
          name: 'internal_tool',
          description: 'Internal tool',
          category: 'test',
          readOnly: true,
          internal: true,
          annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
          zodSchema: z.object({}),
          handler: async () => ({ internal: true }),
        }),
      ],
    });

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test-client', version: '0.0.1' });
    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toEqual(['public_tool', 'internal_tool']);
    expect(tools.find((t) => t.name === 'internal_tool')?._meta).toEqual({
      ui: { visibility: ['app'] },
    });

    const result = await client.callTool({ name: 'internal_tool', arguments: {} });
    expect(result.content[0]?.type).toBe('text');
    expect(result.content[0]?.text).toContain('"internal": true');
  });

  it('serves bundled HTML from resources/read', async () => {
    const html = '<html><body><select></select></body></html>';
    const server = buildMcpServer({
      name: 'test',
      version: '0.0.1',
      tools: [],
      resources: [
        {
          uri: RESOURCE_URI,
          name: 'Create Form',
          description: 'Test form',
          loadHtml: async () => html,
        },
      ],
    });

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test-client', version: '0.0.1' });
    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const listed = await client.listResources();
    expect(listed.resources).toHaveLength(1);
    expect(listed.resources[0]).toMatchObject({
      uri: RESOURCE_URI,
      mimeType: MCP_APP_RESOURCE_MIME_TYPE,
    });

    const read = await client.readResource({ uri: RESOURCE_URI });
    expect(read.contents[0]).toMatchObject({
      uri: RESOURCE_URI,
      mimeType: MCP_APP_RESOURCE_MIME_TYPE,
      text: html,
    });
  });
});
