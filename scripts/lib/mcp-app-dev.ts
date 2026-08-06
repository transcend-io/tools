import { spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { logger } from '../logger.ts';

/** Directory holding this file, used to locate assets that ship beside it. */
const scriptsLibDir = dirname(fileURLToPath(import.meta.url));

/** Repository root, derived from this file rather than the working directory. */
export const repoRoot = resolve(scriptsLibDir, '..', '..');

/** Package the Inspector specs resolve to. */
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
