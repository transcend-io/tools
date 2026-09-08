import { dirname, relative } from 'node:path';

import { quoteShellArgument } from '../scaffolding/project-plan-output.js';

/** Command that can be redirected to a discovered Custom Function project. */
export type ManifestConsumerCommand = 'check' | 'new' | 'run';

/**
 * Format actionable guidance when a requested Custom Function manifest is absent.
 *
 * @param options - Requested and discovered manifest paths
 * @returns Missing-manifest explanation
 */
export function formatMissingManifestMessage(options: {
  /** Command working directory. */
  cwd: string;
  /** Requested absolute manifest path. */
  manifestPath: string;
  /** Other absolute manifests discovered in the surrounding project. */
  discoveredManifestPaths: readonly string[];
  /** Command the user originally invoked. */
  command: ManifestConsumerCommand;
}): string {
  const { command, cwd, manifestPath } = options;
  const requested = relative(cwd, manifestPath) || 'transcend-functions.yml';
  const discovered = options.discoveredManifestPaths.filter(
    (candidate) => candidate !== manifestPath,
  );
  if (discovered.length === 1) {
    const directory = relative(cwd, dirname(discovered[0]!)) || '.';
    return (
      `Custom Function manifest does not exist at ${requested}. ` +
      `Did you mean \`transcend custom-functions ${command} ${quoteShellArgument(directory)}\`?`
    );
  }
  if (discovered.length > 1) {
    const paths = discovered.map((path) => relative(cwd, path)).join(', ');
    return (
      `Custom Function manifest does not exist at ${requested}. ` +
      `Found manifests at: ${paths}. Pass a directory or --manifest explicitly.`
    );
  }
  return (
    `Custom Function manifest does not exist at ${requested}. ` +
    'Run `transcend custom-functions init` to create the default project.'
  );
}
