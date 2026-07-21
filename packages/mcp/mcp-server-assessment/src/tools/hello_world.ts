import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  MCP_APP_RESOURCE_MIME_TYPE,
  createToolResult,
  defineTool,
  z,
  type ResourceDefinition,
} from '@transcend-io/mcp-server-base';

/** UI resource URI for the Hello World MCP App. */
export const HELLO_WORLD_RESOURCE_URI = 'ui://assessments/hello-world.html';

/** Fallback HTML when the Vite/esbuild app bundle has not been built yet. */
const FALLBACK_HELLO_WORLD_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Hello World</title>
  </head>
  <body>
    <h1>Assessments MCP App</h1>
    <p>Hello, World! (rebuild with <code>pnpm run build</code> for the interactive View)</p>
  </body>
</html>
`;

export const HelloWorldSchema = z.object({
  name: z.string().optional().describe('Optional name to greet. Defaults to "World" when omitted.'),
});
export type HelloWorldInput = z.infer<typeof HelloWorldSchema>;

async function readHelloWorldHtml(): Promise<string> {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    // Built package: code lives in dist/*.mjs next to dist/apps/
    join(here, 'apps', 'hello-world.html'),
    // Source / vitest: module is under src/tools/
    join(here, '..', '..', 'dist', 'apps', 'hello-world.html'),
  ];
  for (const htmlPath of candidates) {
    try {
      return await readFile(htmlPath, 'utf8');
    } catch {
      // try next candidate
    }
  }
  // Source / test runs may not have the post-tsdown app bundle yet.
  return FALLBACK_HELLO_WORLD_HTML;
}

/**
 * Public hello-world MCP App demo — no auth required.
 * Renders an interactive View linked via `_meta.ui.resourceUri`.
 */
export function createHelloWorldTool() {
  return defineTool({
    name: 'hello_world',
    description:
      'Hello World MCP App demo for the assessments server. Returns a greeting and renders an interactive in-chat UI. Use this to verify MCP Apps support; it does not call Transcend APIs.',
    category: 'Assessments',
    readOnly: true,
    requireAuth: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: HelloWorldSchema,
    _meta: {
      ui: { resourceUri: HELLO_WORLD_RESOURCE_URI },
    },
    handler: async ({ name }) => {
      const who = name?.trim() || 'World';
      return createToolResult(true, {
        greeting: `Hello, ${who}!`,
        app: 'assessments-hello-world',
      });
    },
  });
}

/** MCP App HTML resource for {@link createHelloWorldTool}. */
export function getHelloWorldResource(): ResourceDefinition {
  return {
    uri: HELLO_WORLD_RESOURCE_URI,
    name: 'Assessments Hello World',
    description: 'Interactive Hello World view for the assessments MCP App demo.',
    mimeType: MCP_APP_RESOURCE_MIME_TYPE,
    read: async () => ({ text: await readHelloWorldHtml() }),
  };
}
