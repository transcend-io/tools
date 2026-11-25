import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path';

import type { LocalContext } from '../../context.js';

/**
 * Resolve a path through its nearest existing ancestor.
 *
 * This retains nonexistent suffixes while resolving every existing symlink in
 * the prefix, which is required before safely creating a new file.
 *
 * @param context - CLI context
 * @param path - Absolute or relative path
 * @returns Physical absolute path
 */
function resolvePhysicalPath(context: LocalContext, path: string): string {
  let current = resolve(path);
  const suffix: string[] = [];
  while (true) {
    try {
      context.fs.lstatSync(current);
      return resolve(context.fs.realpathSync(current), ...suffix);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT' && code !== 'ENOTDIR') {
        throw error;
      }
      const parent = dirname(current);
      if (parent === current) {
        throw error;
      }
      suffix.unshift(basename(current));
      current = parent;
    }
  }
}

/**
 * Determine whether a path physically remains under an approved root.
 *
 * @param context - CLI context
 * @param root - Approved directory
 * @param path - Candidate destination or referenced file
 * @returns Whether existing symlinks keep the path under the root
 */
export function isPathPhysicallyContained(
  context: LocalContext,
  root: string,
  path: string,
): boolean {
  const physicalRoot = resolvePhysicalPath(context, root);
  const physicalPath = resolvePhysicalPath(context, path);
  const child = relative(physicalRoot, physicalPath);
  return child !== '..' && !child.startsWith(`..${sep}`) && !isAbsolute(child);
}

/**
 * Reject a path whose existing symlink ancestors escape an approved root.
 *
 * @param context - CLI context
 * @param root - Approved directory
 * @param path - Candidate path
 */
export function assertPathPhysicallyContained(
  context: LocalContext,
  root: string,
  path: string,
): void {
  if (!isPathPhysicallyContained(context, root, path)) {
    throw new Error(`Refusing to access path outside project root through a symlink: ${path}`);
  }
}
