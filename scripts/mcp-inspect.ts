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
 */

import { parseArgs } from 'node:util';

import {
  ASSUME_CAPABILITIES_ENV_VAR,
  buildTarget,
  DEV_VIEWS_ENV_VAR,
  discoverMcpPackages,
  ensureInspectorSandboxProxy,
  INSPECTOR_V2_SPEC,
  inspectorEnvArgs,
  installShutdownHandlers,
  loadSecretEnv,
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

  logger.log(`Inspecting ${target.name} with ${INSPECTOR_V2_SPEC}`);
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
  // resolution that the build's several seconds hides entirely.
  await Promise.all([buildTarget(target), ensureInspectorSandboxProxy(INSPECTOR_V2_SPEC)]);

  // Serving views from disk means a rebuild is picked up by reopening the app in
  // the Inspector, with no server restart and no reconnect. Set here for the
  // server we spawn under `--http`; a stdio server is handed it explicitly below,
  // because the Inspector does not pass our environment on.
  process.env[DEV_VIEWS_ENV_VAR] = '1';

  // Never set here: the Inspector declares the Apps extension itself, and forcing
  // a capability on would mask a genuine failure to declare one. Reported when set
  // by hand, since it changes which variant every tool resolves to.
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

    // The Inspector infers the transport from the target, and a /mcp path means
    // Streamable HTTP.
    startProcess('inspector', 'npx', ['-y', INSPECTOR_V2_SPEC, url]);
    logger.log(`\nServer listening on ${url}. Open the Apps tab once the Inspector connects.\n`);
    return;
  }

  logger.log('\nLaunching the Inspector. Open the Apps tab once it connects.\n');

  // No `--transport=stdio`: the Inspector parses trailing arguments as its own, so
  // rely on the server defaulting to stdio instead of passing a flag it would eat.
  //
  // The `-e` pairs precede the command because the Inspector parses its own options
  // first and treats the rest as the server to spawn.
  startProcess('inspector', 'npx', [
    '-y',
    INSPECTOR_V2_SPEC,
    ...inspectorEnvArgs(),
    'node',
    ...SERVER_NODE_ARGS,
    target.cliPath,
  ]);
}

main().catch((error: unknown) => {
  logger.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
