import colors from 'colors';
import { bootstrap } from 'global-agent';
import { ProxyAgent, type Dispatcher, setGlobalDispatcher } from 'undici';
import yargs from 'yargs-parser';

import type { CliLogger } from '../../context.js';

/** Runtime dependencies used to initialize CLI proxy support. */
export interface InitializeCliRuntimeDependencies {
  /** Bootstrap proxy support for Node.js request clients. */
  readonly bootstrap: () => void;
  /** Create a dispatcher that routes fetch requests through a proxy. */
  readonly createProxyAgent: (httpProxy: string) => Dispatcher;
  /** Logger used to report proxy initialization. */
  readonly logger: Pick<CliLogger, 'info'>;
  /** Process arguments and environment used to resolve proxy configuration. */
  readonly process: Pick<NodeJS.Process, 'argv' | 'env'>;
  /** Set the dispatcher used by Node.js fetch. */
  readonly setGlobalDispatcher: (dispatcher: Dispatcher) => void;
}

const defaultDependencies: InitializeCliRuntimeDependencies = {
  bootstrap,
  createProxyAgent: (httpProxy) => new ProxyAgent(httpProxy),
  logger: console,
  process,
  setGlobalDispatcher,
};

/**
 * Initialize process-wide proxy support for an executable CLI invocation.
 *
 * @param dependencies - Runtime operations used to configure proxy support.
 */
export function initializeCliRuntime(
  dependencies: InitializeCliRuntimeDependencies = defaultDependencies,
): void {
  const { httpProxy = dependencies.process.env.http_proxy } = yargs(
    dependencies.process.argv.slice(2),
  );
  if (!httpProxy) {
    return;
  }

  dependencies.logger.info(colors.green(`Initializing proxy: ${httpProxy}`));

  // Use global-agent, which overrides `request` based requests.
  dependencies.process.env.GLOBAL_AGENT_HTTP_PROXY = httpProxy;
  dependencies.bootstrap();

  // Use undici, which overrides `fetch` based requests.
  dependencies.setGlobalDispatcher(dependencies.createProxyAgent(httpProxy));
}
