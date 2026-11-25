import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { discoverMcpAppViews, MCP_APP_OUT_DIR, type McpAppView } from '../../vite.config.base.ts';
import { logger } from '../logger.ts';

/** Directory holding this file, used to derive the repository root. */
const scriptsLibDir = dirname(fileURLToPath(import.meta.url));

/** Repository root, derived from this file rather than the working directory. */
export const repoRoot = resolve(scriptsLibDir, '..', '..');

/**
 * Wrapper that sources root `secret.env` then `exec`s `node`.
 *
 * Used by Cursor (`.cursor/mcp.json`) and by `pnpm mcp:inspect` stdio so the
 * Inspector-spawned server gets credentials without putting them on `-e`
 * (which would expose them in process args).
 */
export const MCP_RUN_SCRIPT = join(repoRoot, 'scripts', 'mcp-run.sh');

/**
 * Directories searched for MCP servers, in the order they are listed.
 *
 * `dev` is here because the example server lives outside `packages/`: its views
 * inline hundreds of kilobytes each, which a private package cannot leak into a
 * tarball. It is otherwise built and served like any published server.
 */
const PACKAGE_ROOTS = [join(repoRoot, 'packages', 'mcp'), join(repoRoot, 'dev')];

/** Root whose packages are development-only, matched against {@link PACKAGE_ROOTS}. */
const DEV_ROOT = join(repoRoot, 'dev');

/** The aggregate server, which exposes every sub-package's tools and views. */
export const UMBRELLA_PACKAGE = '@transcend-io/mcp';

/** The example server, which `--examples` selects. */
export const EXAMPLES_PACKAGE = '@transcend-io/mcp-server-examples';

/**
 * The Inspector release `pnpm mcp:inspect` runs.
 *
 * Pinned to the major because a client that stopped declaring
 * `extensions["io.modelcontextprotocol/ui"]` would silently withhold every view.
 */
export const INSPECTOR_SPEC = '@modelcontextprotocol/inspector@2';

/** Environment variable that makes servers read views from disk per request. */
export const DEV_VIEWS_ENV_VAR = 'TRANSCEND_MCP_DEV_VIEWS';

/** Environment variable that forces client capabilities on for local debugging. */
export const ASSUME_CAPABILITIES_ENV_VAR = 'TRANSCEND_MCP_ASSUME_CAPABILITIES';

/** Variables a stdio server needs from us, in the order they are passed. */
const INSPECTOR_FORWARDED_ENV_VARS = [DEV_VIEWS_ENV_VAR, ASSUME_CAPABILITIES_ENV_VAR] as const;

/**
 * Node arguments every server we launch is given, before its own.
 *
 * Servers run from `dist`, so a rejection would otherwise name a line in a bundled
 * chunk. MCP sourcemaps omit embedded sources, which node resolves by reading the
 * TypeScript beside the build — true here, and why this belongs to the dev loop
 * rather than the servers. Only stderr formatting changes, so stdio is unaffected.
 */
export const SERVER_NODE_ARGS = ['--enable-source-maps'] as const;

/**
 * Builds the `-e KEY=VALUE` arguments a stdio Inspector launch needs.
 *
 * The Inspector does not give a stdio server our environment: its proxy builds the
 * child's from a fixed allowlist (`HOME`, `LOGNAME`, `PATH`, `SHELL`, `TERM`,
 * `USER` on POSIX) plus whatever `-e` supplied, so exporting a variable here
 * reaches the Inspector and stops. Losing {@link DEV_VIEWS_ENV_VAR} that way is
 * quiet and misleading: the server keeps serving each view as it was inlined at
 * build time while the watcher reports success on every save.
 *
 * Credentials are deliberately absent, since arguments are readable by anyone on
 * the machine (`ps -o command`). Stdio Inspector launches go through
 * {@link MCP_RUN_SCRIPT}, which sources `secret.env` into the server process.
 * Under `--http` we spawn the server ourselves and it inherits the environment
 * from {@link loadSecretEnv}.
 *
 * @param env - Environment to read, defaulting to this process's
 * @returns Inspector arguments, as `-e KEY=VALUE` pairs
 */
export function inspectorEnvArgs(env: NodeJS.ProcessEnv = process.env): string[] {
  return INSPECTOR_FORWARDED_ENV_VARS.flatMap((name) => {
    const value = env[name];
    // An empty value is an error to the Inspector, not a no-op, so drop it here.
    return value === undefined || value === '' ? [] : ['-e', `${name}=${value}`];
  });
}

/** One MCP App view found in a package. */
export interface DiscoveredView extends McpAppView {
  /** Built document's absolute path, once the view build has run */
  builtHtml: string;
}

/** One MCP package, with whatever views it ships. */
export interface McpPackage {
  /** Package name, e.g. `@transcend-io/mcp-server-docs` */
  name: string;
  /** Directory name within its root, e.g. `mcp-server-docs` */
  dirName: string;
  /** Absolute package directory */
  dir: string;
  /** Absolute path to the built CLI entry point */
  cliPath: string;
  /** Whether the package declares a `bin`, and so can be served at all */
  hasCli: boolean;
  /** Whether the package lives under `dev`, and so is never published or aggregated */
  devOnly: boolean;
  /** Views this package ships */
  views: DiscoveredView[];
}

interface PackageManifest {
  /** Published package name */
  name?: string;
  /** Executables the package publishes */
  bin?: Record<string, string>;
}

function readManifest(packageDir: string): PackageManifest | undefined {
  const manifestPath = join(packageDir, 'package.json');
  if (!existsSync(manifestPath)) return undefined;
  try {
    return JSON.parse(readFileSync(manifestPath, 'utf8')) as PackageManifest;
  } catch {
    return undefined;
  }
}

/**
 * Finds a package's views, using the same discovery the build uses.
 *
 * Shared deliberately: a second implementation here once disagreed with the Vite
 * config about what a package's views even were.
 */
function discoverViews(packageDir: string): DiscoveredView[] {
  return discoverMcpAppViews(packageDir).map((view) => ({
    ...view,
    builtHtml: join(packageDir, MCP_APP_OUT_DIR, view.fileName),
  }));
}

/** Every MCP package in the workspace, sorted by directory name. */
export function discoverMcpPackages(): McpPackage[] {
  const packages: McpPackage[] = [];

  for (const root of PACKAGE_ROOTS) {
    if (!existsSync(root)) continue;

    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const dir = join(root, entry.name);
      const manifest = readManifest(dir);
      if (!manifest?.name) continue;

      packages.push({
        name: manifest.name,
        dirName: entry.name,
        dir,
        cliPath: join(dir, 'dist', 'cli.mjs'),
        hasCli: manifest.bin !== undefined && Object.keys(manifest.bin).length > 0,
        devOnly: root === DEV_ROOT,
        views: discoverViews(dir),
      });
    }
  }

  return packages.sort((a, b) => a.dirName.localeCompare(b.dirName));
}

/** How a command-line invocation chose its server. */
export interface TargetSelection {
  /** Positional package argument, e.g. `docs` */
  argument?: string | undefined;
  /** Whether `--examples` was passed */
  examples?: boolean;
}

/**
 * Resolves a command-line invocation to the server to run.
 *
 * No argument selects the umbrella server, so the default shows every app across
 * every published package. `--examples` selects the example server, which the
 * umbrella does not aggregate. A positional accepts `docs`, `mcp-server-docs`, or
 * the full package name.
 */
export function resolveTarget(
  selection: string | undefined | TargetSelection,
  packages: McpPackage[],
): McpPackage {
  const { argument, examples } =
    typeof selection === 'string' || selection === undefined ? { argument: selection } : selection;

  if (examples === true) {
    if (argument !== undefined && argument !== '') {
      throw new Error(
        `Pass either --examples or a package name, not both (got "${argument}" alongside --examples).`,
      );
    }
    const examplesPackage = packages.find((pkg) => pkg.name === EXAMPLES_PACKAGE);
    if (!examplesPackage) {
      throw new Error(`Could not find the example server ${EXAMPLES_PACKAGE}.`);
    }
    return examplesPackage;
  }

  if (argument === undefined) {
    const umbrella = packages.find((pkg) => pkg.name === UMBRELLA_PACKAGE);
    if (!umbrella) {
      throw new Error(`Could not find the umbrella package ${UMBRELLA_PACKAGE}.`);
    }
    return umbrella;
  }

  // A package without a `bin` is a library, so there is nothing to serve.
  const servable = packages.filter((pkg) => pkg.hasCli);
  const needle = argument.trim().toLowerCase();
  const match = servable.find(
    (pkg) =>
      pkg.name.toLowerCase() === needle ||
      pkg.dirName.toLowerCase() === needle ||
      pkg.dirName.toLowerCase() === `mcp-server-${needle}`,
  );

  if (!match) {
    const options = servable
      .filter((pkg) => pkg.name !== UMBRELLA_PACKAGE && !pkg.devOnly)
      .map((pkg) => pkg.dirName.replace(/^mcp-server-/, ''))
      .join(', ');
    throw new Error(
      `Unknown server "${argument}". Pass one of: ${options}, --examples for the example server, ` +
        'or omit it to run the umbrella server.',
    );
  }
  return match;
}

/**
 * Packages whose views should be watched while `target` is being served.
 *
 * The umbrella aggregates every published sub-package, so all of their views are
 * reachable and all need a watcher; a single package needs only its own.
 *
 * Development-only packages are left out of umbrella scope because the umbrella
 * does not depend on them, so it serves neither their tools nor their `ui://`
 * resources. Watching them would rebuild a view nothing running can serve, which
 * reads as a broken rebuild. Select them with `--examples`.
 */
export function viewPackagesInScope(target: McpPackage, packages: McpPackage[]): McpPackage[] {
  const candidates =
    target.name === UMBRELLA_PACKAGE ? packages.filter((pkg) => !pkg.devOnly) : [target];
  return candidates.filter((pkg) => pkg.views.length > 0);
}

/**
 * Loads `secret.env` into `process.env` when present.
 *
 * Spawned processes inherit it, covering the `--http` server and every view
 * watcher. A stdio server spawned by the Inspector still needs
 * {@link MCP_RUN_SCRIPT}: the Inspector does not forward our environment (see
 * {@link inspectorEnvArgs}).
 */
export function loadSecretEnv(): void {
  const secretEnv = join(repoRoot, 'secret.env');
  if (existsSync(secretEnv)) process.loadEnvFile(secretEnv);
}

/** A child process this script owns, tracked so it can be torn down together. */
interface TrackedChild {
  label: string;
  child: ChildProcess;
}

const children: TrackedChild[] = [];
let shuttingDown = false;

/**
 * Starts a long-lived child process and registers it for shutdown.
 *
 * @param label - Name used in log output
 * @param command - Executable to run
 * @param args - Arguments for the executable
 * @param options - Working directory and extra environment
 * @returns The spawned process
 */
export function startProcess(
  label: string,
  command: string,
  args: string[],
  options: { cwd?: string; env?: Record<string, string | undefined> } = {},
): ChildProcess {
  const child = spawn(command, args, {
    cwd: options.cwd === undefined ? repoRoot : resolve(repoRoot, options.cwd),
    env: { ...process.env, ...options.env },
    stdio: 'inherit',
    shell: false,
  });

  children.push({ label, child });

  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    // One process dying leaves the rest useless, and a half-running environment
    // looks healthy.
    logger.error(`\n[${label}] exited with ${signal ? `signal ${signal}` : `code ${code}`}.`);
    shutdown(code ?? 1);
  });

  return child;
}

/** Terminates every tracked child and exits. */
export function shutdown(code: number): void {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const { child } of children) {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
  }
  process.exit(code);
}

/** Installs SIGINT and SIGTERM handlers that tear the whole group down. */
export function installShutdownHandlers(): void {
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => shutdown(0));
  }
}

/**
 * Runs a command to completion, rejecting when it fails.
 *
 * @param label - Name used in log output
 * @param command - Executable to run
 * @param args - Arguments for the executable
 * @param options - Working directory
 */
export async function runToCompletion(
  label: string,
  command: string,
  args: string[],
  options: { cwd?: string } = {},
): Promise<void> {
  await new Promise<void>((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? repoRoot,
      env: process.env,
      stdio: 'inherit',
      shell: false,
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${label} failed with exit code ${code}.`));
    });
  });
}

/** Builds the target package and everything it depends on. */
export async function buildTarget(target: McpPackage): Promise<void> {
  logger.log(`\nBuilding ${target.name} and its dependencies...`);
  await runToCompletion('turbo build', 'pnpm', [
    'turbo',
    'run',
    'build',
    `--filter=${target.name}...`,
  ]);
}

/** Starts a watching view build for each package whose views are in scope. */
export function startViewWatchers(packages: McpPackage[]): void {
  for (const pkg of packages) {
    logger.log(`Watching views in ${pkg.name} (${pkg.views.map((v) => v.name).join(', ')})`);
    startProcess(
      `views:${pkg.dirName}`,
      'node',
      [join(repoRoot, 'scripts', 'build-mcp-views.ts'), '--watch'],
      { cwd: pkg.dir },
    );
  }
}
