import path from 'node:path';

import type { CapturedProcessResult } from '../cli/run-captured-process.js';

/**
 * Use captured tool output as a concise diagnostic.
 *
 * @param result - Captured process result
 * @param fallback - Message used when the tool emitted no output
 * @returns Diagnostic message
 */
export function getPolicyProcessFailureMessage(
  result: CapturedProcessResult,
  fallback: string,
): string {
  const output = [result.stdout.trim(), result.stderr.trim()].filter(Boolean).join('\n');
  return output || fallback;
}

/**
 * Convert absolute OPA formatter paths to stable project-relative paths.
 *
 * @param stdout - `opa fmt --list` output
 * @param projectDirectory - Absolute policy directory
 * @returns Sorted unique paths
 */
export function parseUnformattedPolicyFiles(stdout: string, projectDirectory: string): string[] {
  return [
    ...new Set(
      stdout
        .split(/\r?\n/gu)
        .map((file) => file.trim())
        .filter(Boolean)
        .map((file) =>
          path.isAbsolute(file)
            ? path.relative(projectDirectory, file).split(path.sep).join('/')
            : file.split(path.sep).join('/'),
        ),
    ),
  ].sort();
}
