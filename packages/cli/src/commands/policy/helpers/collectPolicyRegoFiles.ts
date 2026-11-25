import path from 'node:path';

import type { LocalContext } from '../../../context.js';
import type { PolicyBundleRegoFile } from '../../../lib/policy/policy-bundle-manifest.js';

/**
 * Collect Rego source snapshots without following symlinks.
 *
 * @param context - CLI context
 * @param projectDirectory - Absolute policy directory
 * @param currentDirectory - Current recursive directory
 * @returns Deterministically ordered Rego snapshots
 */
export function collectPolicyRegoFiles(
  context: LocalContext,
  projectDirectory: string,
  currentDirectory: string = projectDirectory,
): PolicyBundleRegoFile[] {
  return context.fs
    .readdirSync(currentDirectory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => {
      const absolutePath = path.join(currentDirectory, entry.name);
      if (entry.isDirectory()) {
        return collectPolicyRegoFiles(context, projectDirectory, absolutePath);
      }
      if (!entry.isFile() || !entry.name.endsWith('.rego')) {
        return [];
      }
      return [
        {
          path: path.relative(projectDirectory, absolutePath).split(path.sep).join('/'),
          contents: context.fs.readFileSync(absolutePath, 'utf8'),
        },
      ];
    });
}
