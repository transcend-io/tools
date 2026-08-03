/**
 * Scaffolds a new MCP App view.
 *
 * A view is three files: the component, the Node-side module that binds the built
 * document to a `ui://` resource, and the tool that opens it. Everything
 * mechanical — the entry that mounts React, the stylesheet that generates the
 * utilities, the Vite config — is synthesized at build time by
 * `vite.config.base.ts`, which is what keeps this template short enough not to
 * drift from what the build expects.
 *
 * The generated tool is deliberately left unregistered. A tool's name and
 * description are public API on a published package, so exporting a placeholder
 * is a decision a person should make; writing the `defineToolWithCapabilities`
 * shape for them is not.
 *
 * The first view in a package also needs package-level wiring, which this adds
 * only when it is missing: `tsconfig.ui.json`, the gitignore entry for the built
 * documents, three scripts, and the browser-side devDependencies.
 *
 * Usage:
 *   pnpm mcp:new-view docs usage-chart
 *   pnpm mcp:new-view mcp-server-consent consent-summary
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parseArgs } from 'node:util';

import {
  discoverMcpPackages,
  repoRoot,
  resolveTarget,
  UMBRELLA_PACKAGE,
  type McpPackage,
} from './lib/mcp-app-dev.ts';
import { logger } from './logger.ts';

/** Scripts a package needs to build and check its views, and where to put them. */
const VIEW_SCRIPTS: {
  /** Script name */
  name: string;
  /** Existing script to sit next to, so the result reads in a sensible order */
  anchor: { before: string } | { after: string };
  /** Script body */
  value: string;
}[] = [
  {
    name: 'prebuild',
    anchor: { before: 'build' },
    value: 'node ../../../scripts/build-mcp-views.ts',
  },
  {
    name: 'build:ui',
    anchor: { after: 'build' },
    value: 'node ../../../scripts/build-mcp-views.ts',
  },
  {
    name: 'typecheck:ui',
    anchor: { after: 'typecheck' },
    value: 'tsc -p tsconfig.ui.json --noEmit',
  },
];

/**
 * devDependencies a view needs.
 *
 * React and its types because the component is a React component; `vite` and
 * `tailwindcss` because the view build runs them from the package directory; and
 * `@transcend-io/design-tokens` because the shared theme resolves the tokens
 * through it.
 */
const VIEW_DEV_DEPENDENCIES: Record<string, string> = {
  '@transcend-io/design-tokens': 'workspace:*',
  '@types/react': 'catalog:',
  '@types/react-dom': 'catalog:',
  react: 'catalog:',
  'react-dom': 'catalog:',
  tailwindcss: 'catalog:',
  vite: 'catalog:',
};

/** Turns a view's directory name into its component's name, e.g. `UsageChart`. */
function toPascalCase(name: string): string {
  return name
    .split(/[^a-zA-Z0-9]+/)
    .filter((part) => part !== '')
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join('');
}

/** Writes a file, refusing to touch one that already exists. */
function writeNew(path: string, contents: string): void {
  if (existsSync(path)) {
    throw new Error(
      `${relative(repoRoot, path)} already exists. Delete it first, or pick a different view name.`,
    );
  }
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, contents);
  logger.log(`  wrote ${relative(repoRoot, path)}`);
}

/** Component source: the whole view, since nothing else about it is a file. */
function componentSource(componentName: string, appName: string): string {
  return `import { useMcpApp } from '@transcend-io/mcp-server-base/ui';

/** Payload shape the tool behind this view returns. */
interface ${componentName}Data {
  /** Replace with the fields the tool actually returns */
  message?: string;
}

/**
 * TODO: describe what this view shows and why it is a view rather than text.
 *
 * Styled with utilities from \`@transcend-io/mcp-server-base/ui/theme.css\`, so
 * every color and size resolves to a host value or a Transcend token. There is no
 * stock Tailwind palette to reach for by accident, and arbitrary values for color
 * or length are rejected by \`scripts/mcp-app-styling.test.ts\`.
 */
export function ${componentName}() {
  const { data, isConnected, connectionError } = useMcpApp<${componentName}Data>({
    appInfo: { name: '${appName}', version: '1.0.0' },
  });

  if (connectionError) {
    return (
      <section className="rounded-lg border-l-4 border-l-danger bg-surface-raised px-6 py-5" role="alert">
        <h1 className="mb-1 text-heading-md font-semibold text-content">Could not reach the host</h1>
        <p className="text-sm text-content-muted">{connectionError.message}</p>
      </section>
    );
  }

  if (!isConnected) {
    return (
      <section className="rounded-lg bg-surface-raised px-6 py-5 shadow-sm" aria-busy="true">
        <h1 className="mb-1 text-heading-md font-semibold text-content">Connecting…</h1>
        <p className="text-sm text-content-muted">Waiting for the host handshake.</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg bg-surface-raised px-6 py-5 shadow-sm">
      <h1 className="mb-1 text-heading-md font-semibold text-content">${componentName}</h1>
      <p className="text-sm text-content-muted">{data?.message ?? 'No data yet.'}</p>
    </section>
  );
}
`;
}

/** Node-side source binding the built document to a `ui://` resource. */
function resourceSource(view: string, constant: string, uri: string): string {
  return `import {
  defineUiResource,
  viewHtml,
  type UiResourceDefinition,
} from '@transcend-io/mcp-server-base';

// Built from src/ui/${view}/ by this package's \`prebuild\` and inlined here as a
// string by tsdown's \`.html\` text loader. The document is fully self-contained
// because hosts render views in a sandboxed iframe with no same-origin server to
// fetch anything from.
import ${constant}_HTML from '../ui/generated/${view}.html';

/** URI hosts fetch to render the ${view} view. */
export const ${constant}_URI = '${uri}';

/** TODO: describe the view in a sentence; hosts may show this. */
export const ${constant}_RESOURCE: UiResourceDefinition = defineUiResource({
  uri: ${constant}_URI,
  name: 'TODO: a short human-readable name',
  description: 'TODO: what a host sees when it lists this resource.',
  // Reads from disk instead when TRANSCEND_MCP_DEV_VIEWS is set, so \`pnpm mcp:inspect\`
  // picks up a view rebuild without restarting the server.
  html: viewHtml({
    bundled: ${constant}_HTML,
    moduleUrl: import.meta.url,
    view: '${view}',
  }),
  prefersBorder: false,
});
`;
}

/** Options for {@link toolSource}. */
interface ToolSourceOptions {
  /** Constant prefix used by the resource module, e.g. `USAGE_CHART_APP` */
  constant: string;
  /** Exported factory's name, e.g. `createUsageChartAppTool` */
  factory: string;
  /** Payload helper's name, e.g. `usageChartPayload` */
  payload: string;
  /** Zod schema constant's name, e.g. `UsageChartAppSchema` */
  schema: string;
  /** Tool's name on the wire, e.g. `docs_usage_chart` */
  toolName: string;
  /** View's directory name, e.g. `usage-chart` */
  view: string;
}

/** Source for the tool that opens the view. */
function toolSource({
  constant,
  factory,
  payload,
  schema,
  toolName,
  view,
}: ToolSourceOptions): string {
  return `import {
  createToolResult,
  defineToolWithCapabilities,
  McpClientCapability,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import { ${constant}_RESOURCE } from '../apps/${view}.js';

export const ${schema} = z.object({
  // TODO: replace with the arguments this tool takes. Every field needs a
  // description: it is what the model reads to decide how to call this.
  message: z.string().optional().describe('Message to show in the view.'),
});
export type ${schema.replace(/Schema$/, 'Input')} = z.infer<typeof ${schema}>;

/**
 * Payload shared by both variants, so the text a host without MCP Apps shows
 * describes the same result the view renders.
 */
function ${payload}(message: string | undefined): unknown {
  return createToolResult(true, {
    message: message ?? 'TODO: return the data this view renders.',
  });
}

/**
 * TODO: describe what this tool does and why its result is worth a view.
 *
 * Not registered yet. Add \`${factory}()\` to the array its package returns from
 * \`src/tools/index.ts\`, which is the point at which the name and description
 * below become public API.
 */
export function ${factory}(_clients?: ToolClients) {
  return defineToolWithCapabilities({
    name: '${toolName}',
    description: 'TODO: what this returns, and when the model should call it.',
    category: 'TODO',
    readOnly: true,
    requireAuth: false,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ${schema},
    // Baseline, used by every host that cannot render a view.
    handler: async ({ message }) => ${payload}(message),
    variants: {
      [McpClientCapability.McpApp]: {
        resource: ${constant}_RESOURCE,
        handler: async ({ message }) => ${payload}(message),
      },
    },
  });
}
`;
}

/** Inserts a key beside its anchor, appending when the anchor is absent. */
function insertBeside<T>(
  target: Record<string, T>,
  anchor: { before: string } | { after: string },
  key: string,
  value: T,
): void {
  const name = 'before' in anchor ? anchor.before : anchor.after;
  const keys = Object.keys(target);
  if (!keys.includes(name)) {
    target[key] = value;
    return;
  }

  const rebuilt: Record<string, T> = {};
  for (const existing of keys) {
    if (existing === name && 'before' in anchor) rebuilt[key] = value;
    rebuilt[existing] = target[existing]!;
    if (existing === name && 'after' in anchor) rebuilt[key] = value;
  }
  for (const existing of keys) delete target[existing];
  Object.assign(target, rebuilt);
}

/** Adds the scripts and devDependencies a view build needs, if absent. */
function wirePackageManifest(pkg: McpPackage): boolean {
  const manifestPath = join(pkg.dir, 'package.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
    scripts?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const scripts = (manifest.scripts ??= {});
  const devDependencies = (manifest.devDependencies ??= {});
  let changed = false;

  for (const { name, anchor, value } of VIEW_SCRIPTS) {
    if (scripts[name] !== undefined) continue;
    insertBeside(scripts, anchor, name, value);
    changed = true;
  }

  for (const [name, version] of Object.entries(VIEW_DEV_DEPENDENCIES)) {
    if (devDependencies[name] !== undefined) continue;
    devDependencies[name] = version;
    changed = true;
  }

  if (!changed) return false;

  manifest.devDependencies = Object.fromEntries(
    Object.entries(devDependencies).sort(([a], [b]) => a.localeCompare(b)),
  );
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  logger.log(`  updated ${relative(repoRoot, manifestPath)}`);
  return true;
}

/**
 * Installs the devDependencies just added to the manifest.
 *
 * Done here rather than left as an instruction because skipping it does not fail
 * where you would look for it: the view build's entry point is synthesized, so an
 * uninstalled React surfaces as a resolver error naming a file that exists
 * nowhere on disk.
 */
function installDevDependencies(): void {
  logger.log('\nInstalling the devDependencies just added...');
  const result = spawnSync('pnpm', ['install'], { cwd: repoRoot, stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(
      'pnpm install failed, so the view cannot build yet. Fix the install and re-run it; ' +
        'the generated files are already in place.',
    );
  }
}

/** Adds `tsconfig.ui.json` and the gitignore entry, if absent. */
function wirePackageFiles(pkg: McpPackage): void {
  const tsconfigPath = join(pkg.dir, 'tsconfig.ui.json');
  if (!existsSync(tsconfigPath)) {
    writeNew(
      tsconfigPath,
      `${JSON.stringify(
        {
          $schema: 'https://json.schemastore.org/tsconfig',
          extends: '../../../tsconfig.ui.base.json',
          include: ['src/ui/**/*.ts', 'src/ui/**/*.tsx'],
          exclude: ['src/ui/generated/**'],
        },
        null,
        2,
      )}\n`,
    );
  }

  const gitignorePath = join(pkg.dir, '.gitignore');
  const entry = 'src/ui/generated/';
  const existing = existsSync(gitignorePath) ? readFileSync(gitignorePath, 'utf8') : '';
  if (!existing.split('\n').includes(entry)) {
    const header = '# Vite-built MCP App views, rebuilt by `pnpm prebuild`';
    const prefix = existing === '' || existing.endsWith('\n') ? existing : `${existing}\n`;
    writeFileSync(gitignorePath, `${prefix}${header}\n${entry}\n`);
    logger.log(`  updated ${relative(repoRoot, gitignorePath)}`);
  }
}

async function main(): Promise<void> {
  const { positionals } = parseArgs({ allowPositionals: true, options: {} });
  const [packageArgument, viewName] = positionals;

  if (packageArgument === undefined || viewName === undefined) {
    throw new Error(
      'Usage: pnpm mcp:new-view <package> <view-name>, e.g. pnpm mcp:new-view docs usage-chart',
    );
  }
  if (!/^[a-z][a-z0-9-]*$/.test(viewName)) {
    throw new Error(
      `View name "${viewName}" must be lowercase kebab-case: it becomes a directory name and the last segment of the view's ui:// uri.`,
    );
  }

  const packages = discoverMcpPackages();
  const pkg = resolveTarget(packageArgument, packages);
  if (pkg.name === UMBRELLA_PACKAGE) {
    throw new Error(
      `${UMBRELLA_PACKAGE} aggregates the other servers rather than owning views. Pass the package the view belongs to.`,
    );
  }

  const shortName = pkg.dirName.replace(/^mcp-server-/, '');
  const pascalCase = toPascalCase(viewName);
  const componentName = `${pascalCase}View`;
  const snakeCase = viewName.replace(/-/g, '_');
  const constant = `${pascalCase.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase()}_APP`;
  const factory = `create${pascalCase}AppTool`;
  const hadViews = pkg.views.length > 0;

  logger.log(`Adding view "${viewName}" to ${pkg.name}`);

  writeNew(
    join(pkg.dir, 'src', 'ui', viewName, `${componentName}.tsx`),
    componentSource(componentName, `transcend-${shortName}-${viewName}`),
  );
  writeNew(
    join(pkg.dir, 'src', 'apps', `${viewName}.ts`),
    resourceSource(viewName, constant, `ui://transcend-${shortName}/${viewName}`),
  );
  writeNew(
    join(pkg.dir, 'src', 'tools', `${snakeCase}_app.ts`),
    toolSource({
      constant,
      factory,
      payload: `${pascalCase[0]!.toLowerCase()}${pascalCase.slice(1)}Payload`,
      schema: `${pascalCase}AppSchema`,
      toolName: `${shortName.replace(/-/g, '_')}_${snakeCase}`,
      view: viewName,
    }),
  );

  wirePackageFiles(pkg);
  if (wirePackageManifest(pkg)) installDevDependencies();

  logger.log('\nStill to do by hand:');
  logger.log(
    `  1. Add ${factory}() to the tools src/tools/index.ts returns, which is what makes the view reachable.`,
  );
  logger.log('  2. Replace the TODOs in all three files, starting with the tool name.');
  logger.log(
    `\nThen: pnpm --filter ${pkg.name} build:ui, and pnpm mcp:inspect ${shortName} to iterate on it.`,
  );
  if (!hadViews) {
    logger.log(`This is ${pkg.name}'s first view, so its package-level wiring was added too.`);
  }
}

main().catch((error: unknown) => {
  logger.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
