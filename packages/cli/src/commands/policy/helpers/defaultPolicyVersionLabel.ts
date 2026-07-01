import { spawnSync } from 'node:child_process';

/**
 * Returns a default version label from git SHA or a timestamp fallback.
 *
 * @param cwd - Working directory for git lookup
 * @returns Version label
 */
export function defaultPolicyVersionLabel(cwd = process.cwd()): string {
  const result = spawnSync('git', ['rev-parse', '--short', 'HEAD'], {
    cwd,
    encoding: 'utf8',
  });
  if (result.status === 0) {
    const sha = result.stdout.trim();
    if (sha) {
      return sha;
    }
  }

  return new Date().toISOString().replace(/[:.]/g, '-');
}
