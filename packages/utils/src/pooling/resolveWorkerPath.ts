import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Resolve the absolute path to a worker module for use with `runPool`.
 *
 * In source mode (tsx), the worker is a sibling `./worker.js` next to the caller.
 * In the built dist, the caller is flattened to `dist/impl-HASH.mjs` but the
 * worker is at its original nested path under `dist/`. This function tries
 * the sibling path first, then falls back to the dist-nested path.
 *
 * @param callerMetaUrl - Pass `import.meta.url` from the calling module
 * @param distWorkerPath - Path to the worker relative to the dist root,
 *   e.g. `'commands/admin/chunk-csv/worker.mjs'`
 * @returns Absolute path to the worker module
 */
export function resolveWorkerPath(callerMetaUrl: string, distWorkerPath: string): string {
  const callerDir = dirname(fileURLToPath(callerMetaUrl));
  const siblingPath = join(callerDir, 'worker.js');

  try {
    require.resolve(siblingPath);
    return siblingPath;
  } catch {
    return join(callerDir, distWorkerPath);
  }
}
