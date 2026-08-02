/**
 * End-to-end check that a real MCP host can fetch and render the hello-world
 * view over stdio, exercising the built CLI rather than an in-process server.
 *
 * This is the check that actually answers "would Claude Desktop render this".
 * Scope is deliberately limited to what only a built artifact on a real
 * transport can show: the shape of the single-file document the view build
 * produces, whether `_meta.ui` survives JSON-RPC serialization, and whether the
 * session detected during `initialize` reaches a tool handler.
 *
 * Capability negotiation itself — which variant a host resolves to, when the
 * `resources` capability is declared, and how app-only companions are exposed —
 * belongs to `@transcend-io/mcp-server-base` and is tested there, against a
 * synthetic tool that needs no build. Re-asserting it here would only mean this
 * file fails alongside those rather than telling us anything new.
 */

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { ElicitRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { MCP_APP_MIME_TYPE, MCP_UI_EXTENSION_ID } from '@transcend-io/mcp-server-base';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { HELLO_APP_URI } from '../src/apps/hello.js';

const cliPath = join(dirname(fileURLToPath(import.meta.url)), '../dist/cli.mjs');

// The built CLI is the subject here, so skip rather than fail when only the
// source has been compiled — `pnpm test` runs before `build` on a clean clone.
const describeIfBuilt = existsSync(cliPath) ? describe : describe.skip;

describeIfBuilt('examples server over stdio (MCP Apps host)', () => {
  let client: Client;

  beforeAll(async () => {
    client = new Client(
      { name: 'claude-ai', version: '1.0.0' },
      {
        capabilities: {
          elicitation: { form: {} },
          extensions: { [MCP_UI_EXTENSION_ID]: { mimeTypes: [MCP_APP_MIME_TYPE] } },
        },
      },
    );
    await client.connect(
      new StdioClientTransport({ command: process.execPath, args: [cliPath, '--transport=stdio'] }),
    );
  }, 30_000);

  afterAll(async () => {
    await client?.close();
  });

  it('serves a complete HTML document that speaks the ui/initialize handshake', async () => {
    const { contents } = await client.readResource({ uri: HELLO_APP_URI });
    const html = contents[0]!.text as string;

    expect(contents[0]!.mimeType).toBe(MCP_APP_MIME_TYPE);
    expect(html.trimStart()).toMatch(/^<!doctype html>/i);
    // Without this exchange the iframe renders but never receives the result.
    expect(html).toContain('ui/initialize');
    expect(html).toContain('ui/notifications/initialized');
    expect(html).toContain('ui/notifications/size-changed');
    expect(html).toContain('ui/notifications/tool-result');
  });

  it('serves the view as one self-contained document with nothing left to fetch', async () => {
    const { contents } = await client.readResource({ uri: HELLO_APP_URI });
    const html = contents[0]!.text as string;

    // A host renders views in a sandboxed iframe with no same-origin server, so a
    // reference to a separate file or origin would render as a blank panel. This
    // is the invariant the Vite single-file build exists to guarantee.
    expect(html).not.toMatch(/<script[^>]+\bsrc=/i);
    expect(html).not.toMatch(/<link[^>]+\bhref=/i);
    expect(html).toContain('<div id="root"></div>');

    // React and the design tokens have to be inside the document, not imported.
    // `sideEffects: false` on this package makes the CSS import droppable in
    // principle, so assert a real token variable survived the bundle, along with
    // the theme variable whose fallback chain ends at it.
    expect(html).toContain('--background-brand-bold');
    expect(html).toContain('--color-brand');

    // Tailwind generates only the classes an `@source` glob reaches, so a stale
    // or missing glob yields a styleless view rather than a build error.
    expect(html).toContain('.bg-surface-raised');
    expect(html).toContain('.text-content-muted');

    // Vite's library mode leaves `process.env.NODE_ENV` for a downstream bundler
    // that a view does not have; unreplaced, it throws on first render.
    expect(html).not.toContain('process.env.NODE_ENV');
  });

  it('inlines the bundle as script that still parses as JavaScript', async () => {
    const { contents } = await client.readResource({ uri: HELLO_APP_URI });
    const html = contents[0]!.text as string;

    const script = /<script>([\s\S]*)<\/script>/.exec(html)?.[1];
    expect(script).toBeDefined();

    // Inlining has to rewrite any `</script` the bundle contains, or the HTML
    // parser ends the element early and the view renders blank. React's bundle
    // does contain that sequence, so this is a live concern rather than a
    // theoretical one. Compiling without running proves the rewrite stayed
    // syntactically valid.
    expect(() => new Script(script!)).not.toThrow();
  });

  it('binds the view to example_hello_app via _meta, in both the canonical and legacy keys', async () => {
    const { tools } = await client.listTools();
    const helloApp = tools.find((tool) => tool.name === 'example_hello_app');
    expect(helloApp).toBeDefined();
    expect(helloApp!._meta).toMatchObject({
      ui: { resourceUri: HELLO_APP_URI },
      'ui/resourceUri': HELLO_APP_URI,
    });
  });

  it('returns a payload the view can render, and identifies the host', async () => {
    const result = await client.callTool({ name: 'example_hello_app', arguments: { name: 'Ada' } });
    const payload = JSON.parse((result.content as { text: string }[])[0]!.text);

    expect(payload.success).toBe(true);
    expect(payload.data.greeting).toBe('Hello, Ada!');
    // stdio has no caller header, so this identity comes purely from clientInfo.
    expect(payload.data.host).toBe('claude');
    expect(payload.data.capabilities).toContain('MCP_APP');
  });
});

describeIfBuilt('examples server over stdio (elicitation-only host)', () => {
  let client: Client;
  let elicitRequests: unknown[];

  beforeAll(async () => {
    elicitRequests = [];
    client = new Client(
      { name: 'cursor', version: '1.0.0' },
      { capabilities: { elicitation: { form: {} } } },
    );

    // Stand in for the host's form UI, so the whole elicitation round trip runs
    // rather than just the capability gate. Answers by what it was asked for,
    // since the two tools here collect different fields.
    client.setRequestHandler(ElicitRequestSchema, async (request) => {
      elicitRequests.push(request.params);
      const asked = Object.keys(request.params.requestedSchema.properties ?? {});
      return asked.includes('label')
        ? {
            action: 'accept',
            content: { label: 'ping', priority: 'high', repeat: 2, tags: ['alpha'], loud: true },
          }
        : { action: 'accept', content: { name: 'Katherine' } };
    });

    await client.connect(
      new StdioClientTransport({ command: process.execPath, args: [cliPath, '--transport=stdio'] }),
    );
  }, 30_000);

  afterAll(async () => {
    await client?.close();
  });

  it('asks the host for a name and greets the answer', async () => {
    const result = await client.callTool({ name: 'example_hello_app', arguments: {} });
    const payload = JSON.parse((result.content as { text: string }[])[0]!.text);

    expect(elicitRequests).toHaveLength(1);
    expect(elicitRequests[0]).toMatchObject({
      mode: 'form',
      message: 'Who should this greeting be addressed to?',
      requestedSchema: { type: 'object' },
    });
    expect(payload.data.greeting).toBe('Hello, Katherine!');
    expect(payload.data.capabilities).toEqual(['ELICITATION']);
  });

  it('sends a form the SDK client accepts, with its select shapes intact', async () => {
    // The client validates an inbound `elicitation/create` against
    // ElicitRequestSchema before dispatching it, so a field shape that does not
    // survive serialization fails here and nowhere else: a stubbed server in a
    // unit test never encodes the schema at all. `oneOf` and `anyOf` are the ones
    // worth pinning, being the only nested structures the spec allows.
    elicitRequests = [];
    const result = await client.callTool({ name: 'example_elicitation', arguments: {} });
    const payload = JSON.parse((result.content as { text: string }[])[0]!.text);

    expect(elicitRequests).toHaveLength(1);
    expect(elicitRequests[0]).toMatchObject({
      mode: 'form',
      requestedSchema: {
        required: ['label', 'priority'],
        properties: {
          priority: { oneOf: expect.arrayContaining([{ const: 'low', title: 'Low' }]) },
          tags: { items: { anyOf: expect.arrayContaining([{ const: 'alpha', title: 'Alpha' }]) } },
        },
      },
    });

    expect(payload.data.outcome).toBe('answered');
    expect(payload.data.echo).toBe('PING PING');
  });

  it('does not prompt when the agent already supplied a name', async () => {
    elicitRequests = [];
    const result = await client.callTool({ name: 'example_hello_app', arguments: { name: 'Ada' } });
    const payload = JSON.parse((result.content as { text: string }[])[0]!.text);

    expect(elicitRequests).toHaveLength(0);
    expect(payload.data.greeting).toBe('Hello, Ada!');
  });
});
