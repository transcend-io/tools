/**
 * Pure helpers for scoped git-hook package selection.
 * Kept separate from the hook runner so unit tests can import them without
 * spawning git/turbo.
 */

/** Workspace package identity used for path → package mapping. */
export type WorkspacePackage = {
  /** Package name from package.json */
  name: string;
  /** Repo-relative package directory */
  directory: string;
};

export const GLOBAL_INFRA_PATHS: ReadonlySet<string> = new Set([
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  // Root package.json is handled via manifestChanges (root checks / test:root),
  // not a full monorepo rebuild — otherwise adding a root script always
  // re-tests every package on first push.
  // turbo.json is intentionally omitted: Turborepo already hashes it into task
  // inputs. Listing it here forced full-monorepo hook runs for any pipeline tweak.
  'tsconfig.json',
  'tsconfig.base.json',
  'tsconfig.ui.base.json',
  'tsdown.config.base.ts',
  'tsdown.config.mcp.ts',
  'vite.config.base.ts',
  'vitest.config.ts',
  'vitest.config.mcp.ts',
  'codegen.ts',
  'schema.graphql',
  'mise.toml',
  'mise.lock',
  '.oxlintrc.json',
  '.oxfmtrc.jsonc',
  '.npmrc',
  '.node-version',
]);

export const GLOBAL_INFRA_PREFIXES: readonly string[] = ['types/', 'assets/'];

/**
 * Package files that do not require typecheck / attw / package tests on their own.
 * Formatting/lint still run on staged files when applicable.
 */
export const PACKAGE_DOC_BASENAMES: ReadonlySet<string> = new Set([
  'readme.md',
  'changelog.md',
  'license',
  'license.md',
]);

/** Classification of a changed file set for hook scoping. */
export type HookChangeAnalysis = {
  /** Packages with quality-relevant file changes */
  packageNames: string[];
  /** Shared infra that should force full checks */
  globalInfra: boolean;
  /** Root scripts/ or husky changes */
  rootScripts: boolean;
  /** package.json / workspace manifest changes */
  manifestChanges: boolean;
};

export function isGlobalInfraPath(file: string): boolean {
  const normalized = file.replaceAll('\\', '/');
  if (GLOBAL_INFRA_PATHS.has(normalized)) return true;
  return GLOBAL_INFRA_PREFIXES.some(
    (prefix) => normalized === prefix.slice(0, -1) || normalized.startsWith(prefix),
  );
}

export function isPackageQualityFile(file: string): boolean {
  const normalized = file.replaceAll('\\', '/');
  const base = normalized.split('/').pop()?.toLowerCase() ?? '';
  if (PACKAGE_DOC_BASENAMES.has(base)) return false;
  if (normalized.includes('/docs/') && base.endsWith('.md')) return false;
  if (base.endsWith('.md') && !normalized.includes('/src/')) return false;
  return true;
}

export function packageForFile(
  file: string,
  workspacePackages: WorkspacePackage[],
): WorkspacePackage | null {
  const normalized = file.replaceAll('\\', '/');
  let match: WorkspacePackage | null = null;
  for (const pkg of workspacePackages) {
    const prefix = `${pkg.directory}/`;
    if (normalized === pkg.directory || normalized.startsWith(prefix)) {
      if (!match || pkg.directory.length > match.directory.length) {
        match = pkg;
      }
    }
  }
  return match;
}

export function analyzeFiles(
  files: string[],
  workspacePackages: WorkspacePackage[],
): HookChangeAnalysis {
  const packageNames = new Set<string>();
  let globalInfra = false;
  let rootScripts = false;
  let manifestChanges = false;

  for (const file of files) {
    const normalized = file.replaceAll('\\', '/');
    if (isGlobalInfraPath(normalized)) {
      globalInfra = true;
    }
    if (
      normalized.startsWith('scripts/') ||
      normalized === 'codegen.ts' ||
      normalized.startsWith('.husky/')
    ) {
      rootScripts = true;
    }
    if (
      normalized === 'package.json' ||
      normalized.endsWith('/package.json') ||
      normalized === 'pnpm-workspace.yaml'
    ) {
      manifestChanges = true;
    }
    const pkg = packageForFile(normalized, workspacePackages);
    if (pkg && isPackageQualityFile(normalized)) {
      packageNames.add(pkg.name);
    }
  }

  return {
    packageNames: [...packageNames].sort(),
    globalInfra,
    rootScripts,
    manifestChanges,
  };
}

/**
 * Build dependents from package.json workspace: deps only (not Turbo's graph).
 * Turbo's graph is polluted by root workspace deps on MCP servers, which makes
 * `--affected` / `--filter=[HEAD]` select the entire monorepo for most edits.
 */
export function buildDependentsIndex(
  workspacePackages: Array<WorkspacePackage & { workspaceDepNames: string[] }>,
): Map<string, Set<string>> {
  const dependentsOf = new Map<string, Set<string>>(
    workspacePackages.map((pkg) => [pkg.name, new Set()]),
  );

  for (const pkg of workspacePackages) {
    for (const depName of pkg.workspaceDepNames) {
      if (!dependentsOf.has(depName)) continue;
      dependentsOf.get(depName)?.add(pkg.name);
    }
  }

  return dependentsOf;
}

export function expandWithDependents(
  packageNames: string[],
  dependentsOf: Map<string, Set<string>>,
): string[] {
  const out = new Set<string>(packageNames);
  const queue = [...packageNames];
  while (queue.length > 0) {
    const name = queue.pop();
    if (!name) continue;
    for (const dependent of dependentsOf.get(name) ?? []) {
      if (out.has(dependent)) continue;
      out.add(dependent);
      queue.push(dependent);
    }
  }
  return [...out].sort();
}
