import path from 'node:path';

import type { LocalContext } from '../../../context.js';

/**
 * Resolve a Regal config file for a bundle, walking up to the workspace.
 *
 * @param context - CLI context
 * @param bundleDirectory - Absolute bundle directory
 * @returns Absolute config path, or undefined when none is found
 */
export function resolveRegalConfigFile(
  context: LocalContext,
  bundleDirectory: string,
): string | undefined {
  let current = bundleDirectory;
  for (;;) {
    const nestedRegalConfig = path.join(current, '.regal', 'config.yaml');
    if (context.fs.existsSync(nestedRegalConfig)) {
      return nestedRegalConfig;
    }
    const rootRegalConfig = path.join(current, '.regal.yaml');
    if (context.fs.existsSync(rootRegalConfig)) {
      return rootRegalConfig;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return undefined;
    }
    current = parent;
  }
}
