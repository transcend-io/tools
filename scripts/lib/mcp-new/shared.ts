/**
 * Machinery every `pnpm mcp:new` kind shares.
 *
 * The kinds differ only in what they write. Resolving the package, spelling the
 * generated names, and refusing to clobber an existing file are the same problem
 * three times over, so they live here and each kind module stays a template.
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { logger } from '../../logger.ts';
import {
  discoverMcpPackages,
  repoRoot,
  resolveTarget,
  UMBRELLA_PACKAGE,
  type McpPackage,
} from '../mcp-app-dev.ts';

/** Artifacts `pnpm mcp:new` knows how to scaffold. */
export const ARTIFACT_KINDS = ['app', 'tool', 'elicitation'] as const;

/** One of {@link ARTIFACT_KINDS}. */
export type ArtifactKind = (typeof ARTIFACT_KINDS)[number];

/** Narrows an arbitrary argument to a kind. */
export function isArtifactKind(value: string): value is ArtifactKind {
  return (ARTIFACT_KINDS as readonly string[]).includes(value);
}

/**
 * Every spelling of the name, derived once.
 *
 * A single kebab-case argument has to become a directory name, a component name,
 * a module name, a constant, and a tool name on the wire. Deriving them together
 * is what keeps the three kinds from disagreeing about any one of them.
 */
export interface ArtifactNames {
  /** As given, e.g. `usage-chart` */
  kebabCase: string;
  /** File and identifier form, e.g. `usage_chart` */
  snakeCase: string;
  /** Type and component form, e.g. `UsageChart` */
  pascalCase: string;
  /** Value form, e.g. `usageChart` */
  camelCase: string;
  /** Constant form, e.g. `USAGE_CHART` */
  constantCase: string;
  /** Package's short name, as used in `ui://` uris and `pnpm mcp:inspect`, e.g. `docs` */
  shortName: string;
  /** Name on the wire, e.g. `docs_usage_chart` */
  toolName: string;
}

/**
 * Packages whose tools are not prefixed with their directory's short name.
 *
 * The prefix is a package's own established spelling rather than anything
 * derived, and these two disagree with their directory in opposite directions, so
 * no rule fits both. Listed rather than scraped from each package's tool names,
 * which nothing enforces.
 */
const TOOL_PREFIXES: Record<string, string> = {
  'mcp-server-assessment': 'assessments',
  'mcp-server-examples': 'example',
};

/** Turns a kebab-case name into its PascalCase form, e.g. `UsageChart`. */
function toPascalCase(name: string): string {
  return name
    .split(/[^a-zA-Z0-9]+/)
    .filter((part) => part !== '')
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join('');
}

/**
 * Rejects a name that cannot serve every role it has to fill.
 *
 * Not cosmetic: the name becomes a directory name, a `*View.tsx` component name,
 * the last segment of a `ui://` uri, and a tool name on the wire. Only one
 * spelling satisfies all four.
 */
export function validateArtifactName(name: string): void {
  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    throw new Error(
      `Name "${name}" must be lowercase kebab-case: it becomes a directory name, a component name, and the last segment of a tool name.`,
    );
  }
}

/** Derives every spelling of an artifact's name from its package and kebab-case name. */
export function deriveNames(pkg: McpPackage, kebabCase: string): ArtifactNames {
  const pascalCase = toPascalCase(kebabCase);
  const snakeCase = kebabCase.replace(/-/g, '_');
  const shortName = pkg.dirName.replace(/^mcp-server-/, '');
  const toolPrefix = (TOOL_PREFIXES[pkg.dirName] ?? shortName).replace(/-/g, '_');

  return {
    kebabCase,
    snakeCase,
    pascalCase,
    camelCase: `${pascalCase[0]!.toLowerCase()}${pascalCase.slice(1)}`,
    constantCase: snakeCase.toUpperCase(),
    shortName,
    toolName: `${toolPrefix}_${snakeCase}`,
  };
}

/**
 * Path from a package to the repo root, in the form a script or `extends` needs.
 *
 * Derived rather than written, because a package's depth is not fixed:
 * `packages/mcp/*` is three levels up and `dev/*` is two, and a generated script
 * that guesses resolves outside the repo. Posix separators, since both the
 * manifest and tsconfig read the result as a path.
 */
export function pathToRepoRoot(packageDir: string): string {
  return relative(packageDir, repoRoot).split(sep).join('/');
}

/**
 * Resolves the package argument, rejecting the umbrella.
 *
 * The umbrella aggregates the other servers rather than owning anything itself,
 * so scaffolding into it would write a file no server ever reads.
 */
export function resolveTargetPackage(argument: string): McpPackage {
  const pkg = resolveTarget(argument, discoverMcpPackages());
  if (pkg.name === UMBRELLA_PACKAGE) {
    throw new Error(
      `${UMBRELLA_PACKAGE} aggregates the other servers rather than owning tools or views. Pass the package this belongs to.`,
    );
  }
  return pkg;
}

/** Writes a file, refusing to touch one that already exists. */
export function writeNew(path: string, contents: string): void {
  if (existsSync(path)) {
    throw new Error(
      `${relative(repoRoot, path)} already exists. Delete it first, or pick a different name.`,
    );
  }
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, contents);
  logger.log(`  wrote ${relative(repoRoot, path)}`);
}

/** Inserts a key beside its anchor, appending when the anchor is absent. */
export function insertBeside<T>(
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

/** What a kind wrote, and what a person still has to do about it. */
export interface ScaffoldResult {
  /** Factory to register, e.g. `createUsageChartAppTool` */
  factory: string;
  /** Module the factory lives in, as `src/tools/index.ts` would import it */
  toolModule: string;
  /** What to do after registering, printed as the second step */
  step: string;
  /** Closing lines that are not steps, such as what to run next */
  notes: string[];
  /**
   * Whether a package manifest changed, and so whether an install is owed.
   *
   * Returned rather than acted on so the generators stay pure filesystem work and
   * a test can exercise them without spawning a package manager.
   */
  manifestChanged: boolean;
}
