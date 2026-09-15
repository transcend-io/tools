#!/usr/bin/env node
/**
 * Scoped git-hook runner for the Transcend tools monorepo.
 *
 * Why this exists:
 * - Husky previously ran full-monorepo `quality:fix` / `test` on every
 *   commit/push (~260 turbo tasks), which is far slower than the docs imply.
 * - Turbo `--affected` / `--filter=[HEAD]` is unreliable here: root
 *   `package.json` workspace-deps on MCP servers make most shared-package
 *   edits look like `RootInternalDepChanged`, so Turbo selects the entire
 *   workspace.
 *
 * Strategy (keeps safety, cuts unrelated work):
 * - pre-commit: format + lint only staged files; typecheck changed packages
 *   and their package.json dependents; run attw/publint only for packages
 *   that themselves changed; run root script checks when scripts/root infra
 *   change. Fall back to full `quality:checks` for global infra edits.
 * - pre-push: test changed packages (vs the remote ref being updated) and
 *   their dependents; include `test:root` when scripts change.
 *
 * Override: FORCE_FULL_HOOK_CHECKS=1 restores full monorepo checks.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  analyzeFiles,
  buildDependentsIndex,
  expandWithDependents,
  type HookChangeAnalysis,
  type WorkspacePackage,
} from './lib/git-hook-scope.ts';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

const FORMAT_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.jsonc',
  '.md',
  '.yml',
  '.yaml',
  '.css',
  '.html',
]);

const LINT_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs']);

type PackageManifest = {
  /** Package name */
  name?: string;
  /** npm scripts map */
  scripts?: Record<string, string>;
  /** Runtime dependencies */
  dependencies?: Record<string, string>;
  /** Dev dependencies */
  devDependencies?: Record<string, string>;
  /** Peer dependencies */
  peerDependencies?: Record<string, string>;
  /** Optional dependencies */
  optionalDependencies?: Record<string, string>;
};

const mode = process.argv[2];
if (mode !== 'pre-commit' && mode !== 'pre-push') {
  console.error(`Usage: node scripts/run-git-hook.ts <pre-commit|pre-push>`);
  process.exit(2);
}

if (process.env.FORCE_FULL_HOOK_CHECKS === '1') {
  console.log('FORCE_FULL_HOOK_CHECKS=1 → running full monorepo checks');
  if (mode === 'pre-commit') {
    process.exit(runTurbo(['run', 'quality:fix']));
  }
  process.exit(runTurbo(['run', 'test', 'test:root']));
}

const packages = listWorkspacePackages();
const packageDetails = packages.map((pkg) => ({
  ...pkg,
  workspaceDepNames: readWorkspaceDepNames(pkg),
}));
const byName = new Map(packages.map((pkg) => [pkg.name, pkg]));
const dependentsOf = buildDependentsIndex(packageDetails);

if (mode === 'pre-commit') {
  process.exit(runPreCommit());
}
process.exit(runPrePush());

function runPreCommit(): number {
  const staged = gitLines(['diff', '--cached', '--name-only', '--diff-filter=ACMR']);
  if (staged.length === 0) {
    console.log('No staged files; skipping hook checks.');
    return 0;
  }

  const analysis = analyzeFiles(staged, packages);

  const beforeStaged = gitCapture(['diff', '--cached', '--binary']);
  const beforeUnstaged = gitCapture(['diff', '--binary']);

  let status = 0;

  status = runFormatAndLint(staged) || status;

  if (analysis.globalInfra) {
    console.log('Global infra changed → running full quality:checks (typecheck/exports/publint).');
    status = runTurbo(['run', 'quality:checks']) || status;
  } else {
    status = runScopedQuality(analysis) || status;
  }

  const afterStaged = gitCapture(['diff', '--cached', '--binary']);
  const afterUnstaged = gitCapture(['diff', '--binary']);

  if (beforeStaged !== afterStaged || beforeUnstaged !== afterUnstaged) {
    console.error('');
    if (status !== 0) {
      console.error(
        'Hook checks failed and also made changes. Review/stage fixes, then commit again.',
      );
    } else {
      console.error('Hook auto-fixes made changes. Review and stage them, then commit again.');
    }
    return 1;
  }

  return status;
}

function runPrePush(): number {
  const pushRanges = readPrePushRanges();
  if (pushRanges.length === 0) {
    console.log('No refs being pushed; skipping tests.');
    return 0;
  }

  const changedFiles = new Set<string>();
  for (const range of pushRanges) {
    const diffRange = range.full
      ? defaultNewBranchDiffRange(range.localSha)
      : `${range.remoteSha}...${range.localSha}`;
    if (range.full) {
      console.log(
        `New ref ${range.localRef} → scoping tests to changes vs ${diffRange.split('...')[0]}.`,
      );
    }
    for (const file of gitLines(['diff', '--name-only', diffRange])) {
      changedFiles.add(file);
    }
  }

  if (changedFiles.size === 0) {
    console.log('No file changes in push range; skipping tests.');
    return 0;
  }

  const analysis = analyzeFiles([...changedFiles], packages);
  if (analysis.globalInfra) {
    console.log('Global infra changed in push → running full test suite.');
    return runTurbo(['run', 'test', 'test:root']);
  }

  return runScopedTests(analysis);
}

/**
 * For brand-new branches (remote SHA all zeros), compare against the merge
 * base with origin/main (or main) so we still scope to branch changes.
 */
function defaultNewBranchDiffRange(localSha: string): string {
  for (const base of ['origin/main', 'main', 'origin/master', 'master']) {
    const mergeBase = spawnSync('git', ['merge-base', base, localSha], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
    if (mergeBase.status === 0) {
      const sha = mergeBase.stdout.trim();
      if (sha) return `${sha}...${localSha}`;
    }
  }
  // Last resort: only the tip commit.
  return `${localSha}^...${localSha}`;
}

function runScopedQuality(analysis: HookChangeAnalysis): number {
  let status = 0;

  const typecheckPackages = expandWithDependents(analysis.packageNames, dependentsOf).filter(
    (name) => packageHasScript(byName.get(name), 'typecheck'),
  );

  const exportPackages = analysis.packageNames.filter((name) =>
    packageHasScript(byName.get(name), 'check:exports'),
  );
  const publintPackages = analysis.packageNames.filter((name) =>
    packageHasScript(byName.get(name), 'check:publint'),
  );
  const skillPackages = analysis.packageNames.filter((name) =>
    packageHasScript(byName.get(name), 'check:skill-bundle'),
  );

  if (typecheckPackages.length > 0) {
    console.log(
      `Typechecking ${typecheckPackages.length} package(s) (changed + dependents):`,
      typecheckPackages.join(', '),
    );
    status =
      runTurbo([
        'run',
        'typecheck',
        'typecheck:ui',
        ...typecheckPackages.map((name) => `--filter=${name}`),
      ]) || status;
  }

  const packagingFilters = unique([...exportPackages, ...publintPackages, ...skillPackages]);
  if (packagingFilters.length > 0) {
    console.log(
      `Checking package exports/publint for ${packagingFilters.length} changed package(s):`,
      packagingFilters.join(', '),
    );
    const tasks: string[] = [];
    if (exportPackages.length > 0) tasks.push('check:exports');
    if (publintPackages.length > 0) tasks.push('check:publint');
    if (skillPackages.length > 0) tasks.push('check:skill-bundle');
    status =
      runTurbo(['run', ...tasks, ...packagingFilters.map((name) => `--filter=${name}`)]) || status;
  }

  if (analysis.rootScripts || analysis.manifestChanges) {
    const rootTasks = ['check:packages', 'check:deps:root'];
    if (analysis.rootScripts) rootTasks.push('typecheck:root');
    console.log(`Running root checks: ${rootTasks.join(', ')}`);
    status = runTurbo(['run', ...rootTasks]) || status;
  }

  if (typecheckPackages.length === 0 && packagingFilters.length === 0 && !analysis.rootScripts) {
    console.log('Staged changes do not require package typecheck/export checks.');
  }

  return status;
}

function runScopedTests(analysis: HookChangeAnalysis): number {
  let status = 0;
  const testPackages = expandWithDependents(analysis.packageNames, dependentsOf).filter((name) =>
    packageHasScript(byName.get(name), 'test'),
  );

  if (testPackages.length > 0) {
    console.log(
      `Testing ${testPackages.length} package(s) (changed + dependents):`,
      testPackages.join(', '),
    );
    status = runTurbo(['run', 'test', ...testPackages.map((name) => `--filter=${name}`)]) || status;
  }

  if (analysis.rootScripts) {
    console.log('Running root tests (scripts/)');
    status = runTurbo(['run', 'test:root']) || status;
  }

  if (testPackages.length === 0 && !analysis.rootScripts) {
    console.log('Push changes do not require package tests.');
  }

  return status;
}

function runFormatAndLint(files: string[]): number {
  const formatTargets = files.filter((file) => {
    const ext = extensionOf(file);
    return FORMAT_EXTENSIONS.has(ext) && existsSync(join(repoRoot, file));
  });
  const lintTargets = files.filter((file) => {
    const ext = extensionOf(file);
    return LINT_EXTENSIONS.has(ext) && existsSync(join(repoRoot, file));
  });

  let status = 0;
  if (formatTargets.length > 0) {
    console.log(`Formatting ${formatTargets.length} staged file(s)`);
    status = runCommand('pnpm', ['exec', 'oxfmt', ...formatTargets]) || status;
  }
  if (lintTargets.length > 0) {
    console.log(`Lint-fixing ${lintTargets.length} staged file(s)`);
    status = runCommand('pnpm', ['exec', 'oxlint', '--fix', ...lintTargets]) || status;
  }
  return status;
}

function listWorkspacePackages(): WorkspacePackage[] {
  const workspaceFile = readFileSync(join(repoRoot, 'pnpm-workspace.yaml'), 'utf8');
  const patterns = [...workspaceFile.matchAll(/^\s*-\s+['"]?([^'"\n]+)['"]?\s*$/gm)].map(
    (match) => match[1],
  );

  const found: WorkspacePackage[] = [];
  for (const pattern of patterns) {
    if (!pattern || !pattern.endsWith('/*')) continue;
    const parent = pattern.slice(0, -2);
    const absParent = join(repoRoot, parent);
    if (!existsSync(absParent)) continue;
    for (const entry of readdirSync(absParent, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const directory = `${parent}/${entry.name}`.replaceAll('\\', '/');
      const manifestPath = join(repoRoot, directory, 'package.json');
      if (!existsSync(manifestPath)) continue;
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as PackageManifest;
      if (typeof manifest.name !== 'string') continue;
      found.push({ name: manifest.name, directory });
    }
  }

  found.sort((a, b) => b.directory.length - a.directory.length);
  return found;
}

function readWorkspaceDepNames(pkg: WorkspacePackage): string[] {
  const manifest = JSON.parse(
    readFileSync(join(repoRoot, pkg.directory, 'package.json'), 'utf8'),
  ) as PackageManifest;
  const deps = {
    ...manifest.dependencies,
    ...manifest.devDependencies,
    ...manifest.peerDependencies,
    ...manifest.optionalDependencies,
  };
  return Object.entries(deps)
    .filter(([, version]) => typeof version === 'string' && version.includes('workspace:'))
    .map(([name]) => name);
}

function packageHasScript(pkg: WorkspacePackage | undefined, script: string): boolean {
  if (!pkg) return false;
  const manifest = JSON.parse(
    readFileSync(join(repoRoot, pkg.directory, 'package.json'), 'utf8'),
  ) as PackageManifest;
  return typeof manifest.scripts?.[script] === 'string';
}

function readPrePushRanges(): Array<{
  localRef: string;
  localSha: string;
  remoteRef: string;
  remoteSha: string;
  full: boolean;
}> {
  let stdin = '';
  if (!process.stdin.isTTY) {
    try {
      stdin = readFileSync(0, 'utf8');
    } catch {
      stdin = '';
    }
  }
  const trimmed = stdin.trim();
  if (!trimmed) return [];
  const zero = '0'.repeat(40);
  return trimmed
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [localRef = '', localSha = '', remoteRef = '', remoteSha = ''] = line.split(/\s+/);
      return {
        localRef,
        localSha,
        remoteRef,
        remoteSha,
        full: !remoteSha || remoteSha === zero,
      };
    });
}

function runTurbo(args: string[]): number {
  return runCommand(
    'pnpm',
    ['exec', 'turbo', ...args, '--output-logs=errors-only', '--no-update-notifier'],
    {
      env: {
        ...process.env,
        // Husky/git hooks often provide a dumb tty that breaks Turbo's TUI.
        TURBO_UI: process.env.TURBO_UI ?? 'stream',
      },
    },
  );
}

function runCommand(
  command: string,
  args: string[],
  options: {
    env?: NodeJS.ProcessEnv;
  } = {},
): number {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    env: options.env ?? process.env,
  });
  if (result.error) {
    console.error(result.error);
    return 1;
  }
  return result.status ?? 1;
}

function gitLines(args: string[]): string[] {
  const stdout = gitCapture(args);
  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function gitCapture(args: string[]): string {
  const result = spawnSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(' ')} failed: ${result.stderr || result.stdout || result.status}`,
    );
  }
  return result.stdout ?? '';
}

function extensionOf(file: string): string {
  const base = file.split('/').pop() ?? file;
  const index = base.lastIndexOf('.');
  if (index <= 0) return '';
  return base.slice(index).toLowerCase();
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}
