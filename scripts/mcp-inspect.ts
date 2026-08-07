/**
 * Opens the official MCP Inspector against a Transcend MCP server.
 *
 * This is the development loop for a view: a real host, a real `initialize`
 * handshake, real `_meta.ui` binding, and a real sandboxed iframe. Views are
 * rebuilt on save and read from disk per `resources/read`, so seeing an edit takes
 * a rebuild and reopening the app rather than a server restart.
 *
 * Usage:
 *   pnpm mcp:inspect               # umbrella server: every app, every published package
 *   pnpm mcp:inspect --examples    # the example server, which the umbrella does not aggregate
 *   pnpm mcp:inspect docs          # one package, which builds faster
 *   pnpm mcp:inspect --http        # serve over Streamable HTTP instead of stdio
 *   pnpm mcp:inspect --v1          # the older Inspector, with the capability override
 *   pnpm mcp:inspect --assume-app  # force the MCP Apps capability on
 *   pnpm mcp:inspect --no-build    # skip the build, when dist is already current
 *
 * Stdio launches the server via scripts/mcp-run.sh so root secret.env (API key
 * or OAuth) is available for real API calls. HTTP mode inherits the same file
 * through loadSecretEnv().
 */

import { parseArgs } from 'node:util';

import {
  ASSUME_CAPABILITIES_ENV_VAR,
  buildTarget,
  DEV_VIEWS_ENV_VAR,
  discoverMcpPackages,
  ensureInspectorSandboxProxy,
  INSPECTOR_V1_SPEC,
  INSPECTOR_V2_SPEC,
  inspectorEnvArgs,
  installShutdownHandlers,
  loadSecretEnv,
  MCP_RUN_SCRIPT,
  resolveTarget,
  startProcess,
  startViewWatchers,
  UMBRELLA_PACKAGE,
  viewPackagesInScope,
} from './lib/mcp-app-dev.ts';
import { logger } from './logger.ts';

const DEFAULT_HTTP_PORT = 3457;

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      http: { type: 'boolean', default: false },
      port: { type: 'string' },
      v1: { type: 'boolean', default: false },
      examples: { type: 'boolean', default: false },
      'assume-app': { type: 'boolean', default: false },
      'no-build': { type: 'boolean', default: false },
      'no-watch': { type: 'boolean', default: false },
    },
  });

  const packages = discoverMcpPackages();
  const target = resolveTarget({ argument: positionals[0], examples: values.examples }, packages);
  const viewPackages = viewPackagesInScope(target, packages);
  const inspectorSpec = values.v1 ? INSPECTOR_V1_SPEC : INSPECTOR_V2_SPEC;

  logger.log(`Inspecting ${target.name} with ${inspectorSpec}`);
  if (target.name === UMBRELLA_PACKAGE) {
    logger.log(
      "Umbrella server selected, so every package's apps are available. Pass a package name " +
        '(e.g. "docs") for a faster build.',
    );
  }
  if (viewPackages.length === 0) {
    logger.log(
      'No MCP App views in scope, so the Apps tab will be empty. ' +
        'Pass --examples for the reference views, which the umbrella does not aggregate.',
    );
  }

  loadSecretEnv();
  installShutdownHandlers();

  // Independent of each other, so overlap them: the sandbox check costs an `npx`
  // resolution that the build's several seconds hides entirely. v1 keeps its
  // static assets somewhere else and is unaffected.
  await Promise.all([
    values['no-build'] ? Promise.resolve() : buildTarget(target),
    values.v1 ? Promise.resolve() : ensureInspectorSandboxProxy(inspectorSpec),
  ]);

  // Serving views from disk means a rebuild is picked up by reopening the app in
  // the Inspector, with no server restart and no reconnect. Set here for the
  // server we spawn under `--http`; a stdio server is handed it explicitly below,
  // because the Inspector does not pass our environment on.
  process.env[DEV_VIEWS_ENV_VAR] = '1';

  // v1 declares no capabilities at all, so without this its Apps tab is empty no
  // matter how correct the server is. v2 declares the extension properly and
  // needs nothing, which is why it is the default and this stays opt-in: forcing
  // the capability on would mask a genuine negotiation failure.
  if (values.v1 || values['assume-app']) {
    process.env[ASSUME_CAPABILITIES_ENV_VAR] ??= 'MCP_APP';
    const forced = process.env[ASSUME_CAPABILITIES_ENV_VAR];
    // Set but empty is deliberate: it is how you reach a tool's baseline branch,
    // since v1 declares nothing and the override cannot subtract a capability.
    logger.log(
      forced === ''
        ? `${ASSUME_CAPABILITIES_ENV_VAR} is set but empty, so capabilities stay exactly as the client declared them.`
        : `Forcing client capabilities on (${forced}) because ` +
            `${values.v1 ? 'v1 does not advertise the MCP Apps extension' : '--assume-app was passed'}.`,
    );
  }

  if (!values['no-watch']) startViewWatchers(viewPackages);

  if (values.http) {
    const port = values.port ?? String(DEFAULT_HTTP_PORT);
    const url = `http://127.0.0.1:${port}/mcp`;

    startProcess('server', 'node', [target.cliPath, '--transport=http', `--port=${port}`]);

    if (values.v1) {
      startProcess('inspector', 'npx', ['-y', inspectorSpec]);
      logger.log(
        `\nServer listening on ${url}.\n` +
          'In the Inspector, choose the "Streamable HTTP" transport and paste that URL, ' +
          'then open the Apps tab.\n',
      );
      return;
    }

    // v2 infers the transport from the target, and a /mcp path means Streamable HTTP.
    startProcess('inspector', 'npx', ['-y', inspectorSpec, url]);
    logger.log(`\nServer listening on ${url}. Open the Apps tab once the Inspector connects.\n`);
    return;
  }

  logger.log('\nLaunching the Inspector. Open the Apps tab once it connects.\n');

  // v1 forwards trailing arguments to the server; v2 parses them as its own, so
  // rely on the server defaulting to stdio there instead of passing a flag.
  // mcp-run.sh sources secret.env then execs node — same path as Cursor — so
  // credentials reach the server without putting them on Inspector `-e` args.
  const serverArgs = values.v1 ? [target.cliPath, '--transport=stdio'] : [target.cliPath];

  // The `-e` pairs precede the command because both Inspector versions parse
  // their own options first and treat the rest as the server to spawn.
  startProcess('inspector', 'npx', [
    '-y',
    inspectorSpec,
    ...inspectorEnvArgs(),
    'bash',
    MCP_RUN_SCRIPT,
    ...serverArgs,
  ]);
}

main().catch((error: unknown) => {
  logger.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
