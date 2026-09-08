/**
 * Opens the official MCP Inspector against a Transcend MCP server.
 *
 * The development loop for a view: a real host, a real `initialize` handshake, real
 * `_meta.ui` binding, and a real sandboxed iframe. Views are rebuilt on save and
 * read from disk per `resources/read`, so seeing an edit takes reopening the app
 * rather than a server restart.
 *
 * Usage:
 *   pnpm mcp:inspect               # umbrella server: every app, every published package
 *   pnpm mcp:inspect --examples    # the example server, which the umbrella does not aggregate
 *   pnpm mcp:inspect docs          # one package, which builds faster
 *   pnpm mcp:inspect --http        # serve over Streamable HTTP instead of stdio
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
  INSPECTOR_SPEC,
  inspectorEnvArgs,
  installShutdownHandlers,
  loadSecretEnv,
  MCP_RUN_SCRIPT,
  resolveTarget,
  SERVER_NODE_ARGS,
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
      examples: { type: 'boolean', default: false },
    },
  });

  const packages = discoverMcpPackages();
  const target = resolveTarget({ argument: positionals[0], examples: values.examples }, packages);
  const viewPackages = viewPackagesInScope(target, packages);

  logger.log(`Inspecting ${target.name} with ${INSPECTOR_SPEC}`);
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

  await buildTarget(target);

  // Set here for the server we spawn under `--http`; a stdio server is handed it
  // explicitly below, because the Inspector does not pass our environment on.
  process.env[DEV_VIEWS_ENV_VAR] = '1';

  // Never set here, since forcing a capability on would mask a genuine failure to
  // declare one. Reported when set by hand, because it changes which variant every
  // tool resolves to.
  const forcedCapabilities = process.env[ASSUME_CAPABILITIES_ENV_VAR];
  if (forcedCapabilities !== undefined) {
    logger.log(
      forcedCapabilities === ''
        ? `${ASSUME_CAPABILITIES_ENV_VAR} is set but empty, so capabilities stay exactly as the client declared them.`
        : `${ASSUME_CAPABILITIES_ENV_VAR} is forcing client capabilities on (${forcedCapabilities}).`,
    );
  }

  startViewWatchers(viewPackages);

  if (values.http) {
    const port = values.port ?? String(DEFAULT_HTTP_PORT);
    const url = `http://127.0.0.1:${port}/mcp`;

    startProcess('server', 'node', [
      ...SERVER_NODE_ARGS,
      target.cliPath,
      '--transport=http',
      `--port=${port}`,
    ]);

    // The Inspector infers the transport, and a /mcp path means Streamable HTTP.
    startProcess('inspector', 'npx', ['-y', INSPECTOR_SPEC, url]);
    logger.log(`\nServer listening on ${url}. Open the Apps tab once the Inspector connects.\n`);
    return;
  }

  logger.log('\nLaunching the Inspector. Open the Apps tab once it connects.\n');

  // No `--transport=stdio`, because the Inspector would parse it as its own; the
  // server defaults to stdio anyway. Same reason the `-e` pairs precede the command:
  // the Inspector takes its own options first and the rest as the server to spawn.
  // mcp-run.sh sources secret.env then execs node — same path as Cursor — so
  // credentials reach the server without putting them on Inspector `-e` args.
  startProcess('inspector', 'npx', [
    '-y',
    INSPECTOR_SPEC,
    ...inspectorEnvArgs(),
    'bash',
    MCP_RUN_SCRIPT,
    ...SERVER_NODE_ARGS,
    target.cliPath,
  ]);
}

main().catch((error: unknown) => {
  logger.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
