import { spawn, type ChildProcess } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { discoverMcpAppViews, MCP_APP_OUT_DIR, type McpAppView } from '../../vite.config.base.ts';
import { logger } from '../logger.ts';

/** Directory holding this file, used to locate assets that ship beside it. */
const scriptsLibDir = dirname(fileURLToPath(import.meta.url));

/** Repository root, derived from this file rather than the working directory. */
export const repoRoot = resolve(scriptsLibDir, '..', '..');

/**
 * Directories searched for MCP servers, in the order they are listed.
 *
 * `dev` is included because the example server lives there rather than beside the
 * published packages: its views inline hundreds of kilobytes each, and a private
 * package cannot leak them into a tarball. Nothing else distinguishes it — it is
 * built, served, and inspected exactly like a published server.
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
 * v2 is the floor rather than a preference. All three of its clients (web, CLI,
 * TUI) declare `extensions["io.modelcontextprotocol/ui"]` in `initialize`, which
 * is what a spec-correct server requires before it will bind a view to a tool,
 * and its CLI has an `--app-info` probe that reports a tool's app metadata
 * directly. Earlier releases declare no capabilities at all, so every view is
 * withheld and the Apps tab renders empty. Pinned to the major so security fixes
 * land without a surprise rewrite.
 */
export const INSPECTOR_V2_SPEC = '@modelcontextprotocol/inspector@2';

/** Package the Inspector specs above resolve to. */
const INSPECTOR_PACKAGE_NAME = '@modelcontextprotocol/inspector';

/**
 * Path the Inspector's web client reads the app sandbox document from, relative
 * to its install directory.
 */
const SANDBOX_PROXY_PATH = join('clients', 'web', 'static', 'sandbox_proxy.html');

/** Our copy of the document, kept byte-identical to upstream's. */
const VENDORED_SANDBOX_PROXY = join(scriptsLibDir, 'inspector-sandbox-proxy.html');

/** What {@link restoreSandboxProxy} did, for logging and tests. */
export type SandboxProxyOutcome = 'present' | 'written' | 'unrecognized';

/**
 * Writes the sandbox proxy document into an Inspector install that is missing it.
 *
 * TODO(ZEL-8153): https://github.com/modelcontextprotocol/inspector/issues/1859 —
 * delete this, the vendored document, and its call site once a release ships the
 * file. Tracking ticket: https://linear.app/transcend/issue/ZEL-8153
 * The published v2 tarball's `files` list covers `clients/web/build` and
 * `clients/web/dist` but not `clients/web/static`, so the one document the Apps
 * tab needs is absent. The web server reads it at startup, swallows the ENOENT,
 * and substitutes its own error page, which then renders *inside the app frame*
 * as "Sandbox not loaded: ENOENT ...". Every other tab works, so it looks like a
 * broken view rather than a missing file. Upstream shipped and fixed the same
 * omission once before in v1 (issue #1113, for `server/static`).
 *
 * Restoring the file rather than working around it is deliberate: the proxy is
 * the security boundary for app rendering — it holds the untrusted view at an
 * opaque origin, strips `allow-same-origin` from anything a server asks for, and
 * relays bridge messages between host and view. A substitute of our own would
 * make this loop diverge from real hosts on exactly the axis the Inspector is
 * here to check, so the vendored copy is upstream's file verbatim — down to the
 * bytes, which is why the formatter is told to skip it and a test pins its hash.
 * Compare it against upstream with:
 *
 * ```bash
 * curl -s https://raw.githubusercontent.com/modelcontextprotocol/inspector/main/clients/web/static/sandbox_proxy.html \
 *   | diff -u - scripts/lib/inspector-sandbox-proxy.html
 * ```
 *
 * @param installDir - Root of an Inspector installation
 * @returns Whether the document was already there, written, or the directory did
 * not look like an Inspector install
 */
export function restoreSandboxProxy(installDir: string): SandboxProxyOutcome {
  // Absent `clients/web` this is not the layout the fix was written against, so
  // creating directories would be guessing at someone else's package.
  if (!existsSync(join(installDir, 'clients', 'web'))) return 'unrecognized';

  const target = join(installDir, SANDBOX_PROXY_PATH);
  if (existsSync(target)) return 'present';

  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(VENDORED_SANDBOX_PROXY, target);
  return 'written';
}

/**
 * Locates the directory `npx` installed a package into.
 *
 * Derived from the child's own `PATH` rather than by globbing `~/.npm/_npx`,
 * because npm decides where that cache lives — it moves with `npm_config_cache`,
 * and sandboxes relocate it wholesale. Running the probe under the same spec we
 * are about to launch is what guarantees we patch the install that will be used.
 *
 * @param spec - Package spec to resolve, e.g. `pkg@2`
 * @param packageName - Package to find inside the install
 * @returns The package directory, or undefined if it could not be located
 */
async function resolveNpxPackageDir(
  spec: string,
  packageName: string,
): Promise<string | undefined> {
  const probe = `
    const path = require('node:path');
    const fs = require('node:fs');
    const segments = ${JSON.stringify(packageName.split('/'))};
    for (const dir of (process.env.PATH || '').split(path.delimiter)) {
      if (path.basename(dir) !== '.bin') continue;
      if (path.basename(path.dirname(dir)) !== 'node_modules') continue;
      const manifest = path.join(path.dirname(dir), ...segments, 'package.json');
      if (fs.existsSync(manifest)) {
        process.stdout.write(path.dirname(manifest));
        break;
      }
    }
  `;

  const stdout = await new Promise<string>((resolvePromise, reject) => {
    const child = spawn('npx', ['-y', `--package=${spec}`, 'node', '-e', probe], {
      cwd: repoRoot,
      env: process.env,
      // npm prints install and peer-dependency warnings to stderr that say
      // nothing about whether the probe worked, so keep them out of the way.
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    });

    let output = '';
    let errors = '';
    child.stdout?.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      errors += chunk.toString();
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolvePromise(output.trim());
      else reject(new Error(`Resolving ${spec} failed with exit code ${code}. ${errors.trim()}`));
    });
  });

  return stdout === '' ? undefined : stdout;
}

/**
 * Makes sure the Inspector can render an app before we hand it a server that
 * serves one.
 *
 * Warns rather than throws on every failure path. This works around someone
 * else's packaging bug, and the Inspector is still useful for tools, resources,
 * and the handshake even when the Apps tab cannot paint — refusing to launch over
 * it would be a worse outcome than a rendered error the warning explains. See
 * {@link restoreSandboxProxy} for the removal condition.
 *
 * @param spec - Inspector spec about to be launched
 */
export async function ensureInspectorSandboxProxy(spec: string): Promise<void> {
  try {
    const installDir = await resolveNpxPackageDir(spec, INSPECTOR_PACKAGE_NAME);
    if (installDir === undefined) {
      logger.log(
        `Could not locate the ${spec} install to check its app sandbox document. ` +
          'If the app frame shows "Sandbox not loaded", that is why.',
      );
      return;
    }

    const outcome = restoreSandboxProxy(installDir);
    if (outcome === 'written') {
      logger.log(
        `Restored the missing app sandbox document in ${spec} ` +
          '(upstream inspector issue 1859); the Apps tab would render an ENOENT without it.',
      );
    } else if (outcome === 'unrecognized') {
      logger.log(
        `The ${spec} install has an unfamiliar layout, so its app sandbox document was left alone.`,
      );
    }
  } catch (error) {
    logger.log(
      `Could not check the app sandbox document in ${spec}: ` +
        `${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/** Environment variable that makes servers read views from disk per request. */
export const DEV_VIEWS_ENV_VAR = 'TRANSCEND_MCP_DEV_VIEWS';

/** Environment variable that forces client capabilities on for local debugging. */
export const ASSUME_CAPABILITIES_ENV_VAR = 'TRANSCEND_MCP_ASSUME_CAPABILITIES';

/** Variables a stdio server needs from us, in the order they are passed. */
const INSPECTOR_FORWARDED_ENV_VARS = [DEV_VIEWS_ENV_VAR, ASSUME_CAPABILITIES_ENV_VAR] as const;

/**
 * Node arguments every server we launch is given, before its own.
 *
 * We always run a server from `dist`, so an unhandled rejection in a tool would
 * otherwise report a line in a bundled chunk. MCP sourcemaps carry mappings
 * without embedded sources, which node resolves by reading the TypeScript beside
 * the build — true here, and the reason this belongs to the dev loop rather than
 * to the servers themselves. Only error formatting on stderr changes, so a stdio
 * session is unaffected.
 */
export const SERVER_NODE_ARGS = ['--enable-source-maps'] as const;

/**
 * Builds the `-e KEY=VALUE` arguments a stdio Inspector launch needs.
 *
 * The Inspector does not give a stdio server our environment. Its proxy builds
 * the child's environment from a fixed allowlist — `HOME`, `LOGNAME`, `PATH`,
 * `SHELL`, `TERM`, `USER` on POSIX — and merges in only what `-e` supplied, so
 * exporting a variable in this process reaches the Inspector and stops there.
 *
 * That gap is worth a comment this long because its symptom accuses the wrong
 * thing. Without {@link DEV_VIEWS_ENV_VAR} the server serves each view as it was
 * inlined at package build time, so a rebuilt view keeps rendering its old markup
 * through app reopens, page reloads, reconnects, and Inspector restarts — while
 * the watcher reports success on every save. It reads as a stuck host or a broken
 * watcher rather than a dropped variable.
 *
 * Credentials are deliberately absent: arguments are readable by anyone on the
 * machine (`ps -o command`), which is no place for an API key. Use `--http` when
 * a tool needs to reach the Transcend API, since we spawn the server there and it
 * inherits the environment normally.
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
 * Shared deliberately: this used to look for `src/ui/<name>/main.tsx` while each
 * package's Vite config named its entry separately, so the watchers and the build
 * could disagree about what a package's views even were.
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
 * Omitting everything selects the umbrella server, so the default shows every app
 * across every published package. `--examples` selects the example server, which
 * the umbrella deliberately does not aggregate. A positional argument accepts the
 * short form (`docs`), the directory name (`mcp-server-docs`), or the full package
 * name.
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
 * The umbrella aggregates every published sub-package, so working against it means
 * every one of their views is reachable and all of them need a watcher. A single
 * package needs only its own.
 *
 * Development-only packages are excluded from umbrella scope because the umbrella
 * does not depend on them, so it owns neither their tools nor their `ui://`
 * resources. Watching them anyway would rebuild a view no running server can
 * serve, which reads as a broken rebuild rather than a server that was never
 * asked to serve it. Select them with `--examples` instead.
 */
export function viewPackagesInScope(target: McpPackage, packages: McpPackage[]): McpPackage[] {
  const candidates =
    target.name === UMBRELLA_PACKAGE ? packages.filter((pkg) => !pkg.devOnly) : [target];
  return candidates.filter((pkg) => pkg.views.length > 0);
}

/**
 * Loads `secret.env` into `process.env` when present.
 *
 * Processes we spawn inherit the result, which covers the server under `--http`
 * and every view watcher. A stdio server spawned by the Inspector does not, for
 * the reason {@link inspectorEnvArgs} explains.
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
    // One process dying leaves the rest useless, so fail the whole command
    // rather than leaving a half-running environment that looks healthy.
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
