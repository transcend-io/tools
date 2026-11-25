import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { mergeDenoConfiguration } from '../scaffold-config.js';

/**
 * Resolve the workspace `@transcend-io/custom-function-types` source for Deno
 * contract tests. Version Packages bumps this version before it is available
 * from npm, and CI runs tests before package builds.
 *
 * @returns Absolute `file:` URL to the authoring contract source
 */
function localCustomFunctionTypesSpecifier(): string {
  const packageEntry = fileURLToPath(import.meta.resolve('@transcend-io/custom-function-types'));
  const contractSource = resolve(dirname(packageEntry), '..', 'src', 'contract.ts');
  if (!existsSync(contractSource)) {
    throw new Error(
      `Could not locate the Custom Function authoring contract at ${contractSource}.`,
    );
  }
  return pathToFileURL(contractSource).href;
}

/**
 * Build Deno config backed by the local authoring contract declaration.
 *
 * @param contractVersion - Workspace contract version
 * @returns Deno configuration for contract tests
 */
export function localCustomFunctionTypesDenoConfiguration(contractVersion: string): string {
  const npmSpecifier = `npm:@transcend-io/custom-function-types@${contractVersion}`;
  return mergeDenoConfiguration(null, contractVersion).replace(
    npmSpecifier,
    localCustomFunctionTypesSpecifier(),
  );
}
