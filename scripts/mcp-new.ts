/**
 * Scaffolds a new MCP artifact: a tool, an MCP App, or a form-collecting tool.
 *
 * One command rather than three because the kinds differ only in what they write.
 * Resolving the package, spelling the generated names, and refusing to clobber an
 * existing file are shared, and so is the one thing left undone — registration,
 * which stays a person's decision because a tool's name and description are public
 * API on a published package.
 *
 * The kind is required and has no default. Only `app` touches a package manifest,
 * which is what keeps React out of a package that ships no view.
 *
 * Usage:
 *   pnpm mcp:new app         inventory usage-chart
 *   pnpm mcp:new tool        docs      fetch-usage
 *   pnpm mcp:new elicitation consent   confirm-optout
 */

import { parseArgs } from 'node:util';

import type { McpPackage } from './lib/mcp-app-dev.ts';
import { installDevDependencies, scaffoldApp } from './lib/mcp-new/app.ts';
import { scaffoldElicitation } from './lib/mcp-new/elicitation.ts';
import {
  ARTIFACT_KINDS,
  deriveNames,
  isArtifactKind,
  resolveTargetPackage,
  validateArtifactName,
  type ArtifactKind,
  type ArtifactNames,
  type ScaffoldResult,
} from './lib/mcp-new/shared.ts';
import { scaffoldTool } from './lib/mcp-new/tool.ts';
import { logger } from './logger.ts';

/** What each kind writes, and the one line of prose describing it. */
const KINDS: Record<
  ArtifactKind,
  {
    /** What the kind produces, for the `Adding …` line */
    summary: string;
    /** Generator for the kind */
    scaffold: (pkg: McpPackage, names: ArtifactNames) => ScaffoldResult;
  }
> = {
  app: {
    summary: 'MCP App (view, ui:// resource, and the tool that opens it)',
    scaffold: scaffoldApp,
  },
  tool: { summary: 'tool', scaffold: scaffoldTool },
  elicitation: { summary: 'form-collecting tool', scaffold: scaffoldElicitation },
};

const USAGE = `Usage: pnpm mcp:new <${ARTIFACT_KINDS.join('|')}> <package> <name>

  app          a view, its ui:// resource, and the tool that opens it
  tool         a single tool with no capability variants
  elicitation  a tool that collects its arguments through a host-rendered form

For example: pnpm mcp:new app inventory usage-chart`;

async function main(): Promise<void> {
  const { positionals } = parseArgs({ allowPositionals: true, options: {} });
  const [kindArgument, packageArgument, name] = positionals;

  if (kindArgument === undefined || packageArgument === undefined || name === undefined) {
    throw new Error(USAGE);
  }
  if (!isArtifactKind(kindArgument)) {
    throw new Error(`Unknown kind "${kindArgument}".\n\n${USAGE}`);
  }
  validateArtifactName(name);

  const kind = KINDS[kindArgument];
  const pkg = resolveTargetPackage(packageArgument);
  const names = deriveNames(pkg, name);

  logger.log(`Adding ${kind.summary} "${name}" to ${pkg.name}`);

  const result = kind.scaffold(pkg, names);
  if (result.manifestChanged) installDevDependencies();

  logger.log('\nStill to do by hand:');
  logger.log(`  1. Register it, by adding these two lines to ${pkg.dirName}/src/tools/index.ts:`);
  logger.log(`\n       import { ${result.factory} } from '${result.toolModule}';`);
  logger.log(`       ${result.factory}(),\n`);
  result.steps.forEach((step, index) => logger.log(`  ${index + 2}. ${step}`));
  for (const note of result.notes) logger.log(`\n${note}`);
}

main().catch((error: unknown) => {
  logger.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
