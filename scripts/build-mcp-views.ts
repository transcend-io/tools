/**
 * Builds every MCP App view a package ships, one self-contained document each.
 *
 * Replaces a per-package `vite.views.config.ts`. That file had to name a single
 * entry, and because the single-file plugin collapses the whole bundle into one
 * document, a second view in the same package would not have failed — it would
 * have emitted one document containing both. Views are discovered from `src/ui`
 * instead, and each gets its own build.
 *
 * Usage:
 *   node ../../../scripts/build-mcp-views.ts           # from a package directory
 *   node scripts/build-mcp-views.ts packages/mcp/mcp-server-docs
 *   node scripts/build-mcp-views.ts --watch            # rebuild on change
 */

import { rmSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { build } from 'vite';

import { defineMcpAppView, discoverMcpAppViews, MCP_APP_OUT_DIR } from '../vite.config.base.ts';
import { logger } from './logger.ts';

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { watch: { type: 'boolean', default: false } },
  });

  const packageDir = path.resolve(positionals[0] ?? process.cwd());
  const views = discoverMcpAppViews(packageDir);

  if (views.length === 0) {
    throw new Error(
      `No MCP App views found under ${path.join(path.relative(process.cwd(), packageDir) || '.', 'src/ui')}. ` +
        'A view is a directory there holding exactly one *View.tsx.',
    );
  }

  // Cleared once here rather than per build, since every view writes into it.
  // This is also what retires the document of a view that has been deleted.
  rmSync(path.join(packageDir, MCP_APP_OUT_DIR), { recursive: true, force: true });

  logger.log(`Building ${views.length} view(s): ${views.map((view) => view.name).join(', ')}`);

  for (const view of views) {
    const config = defineMcpAppView({ view });
    await build({
      ...config,
      // Never inferred from disk: a stray `vite.config.ts` beside a package would
      // silently replace all of this.
      configFile: false,
      root: packageDir,
      logLevel: 'warn',
      build: { ...config.build, ...(values.watch && { watch: {} }) },
    });
    logger.log(`  ${view.name} -> ${path.join(MCP_APP_OUT_DIR, view.fileName)}`);
  }
}

main().catch((error: unknown) => {
  logger.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
