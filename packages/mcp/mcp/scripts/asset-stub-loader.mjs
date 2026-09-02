/**
 * Node custom loader for non-JS assets when docgen imports MCP packages via tsx.
 *
 * - `.svg` is stubbed as an empty string (OAuth callback logo; content unused by docgen).
 * - `.html` is loaded as a text module, matching tsdown / Vitest. MCP App views pass the
 *   document through `defineUiResource`, which rejects empty HTML.
 */
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  const resolved = await nextResolve(specifier, context);
  if (resolved.url.endsWith('.svg') || resolved.url.endsWith('.html')) {
    return {
      ...resolved,
      format: 'module',
      shortCircuit: true,
    };
  }
  return resolved;
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('.svg')) {
    return {
      format: 'module',
      shortCircuit: true,
      source: 'export default "";\n',
    };
  }

  if (url.endsWith('.html')) {
    const path = fileURLToPath(url);
    // Generated MCP App views are gitignored; build first (publish / sync-mcp-docs do).
    if (!existsSync(path)) {
      throw new Error(`${path} has not been built. Run the package view build before docgen.`);
    }
    return {
      format: 'module',
      shortCircuit: true,
      source: `export default ${JSON.stringify(readFileSync(path, 'utf8'))};\n`,
    };
  }

  return nextLoad(url, context);
}
