import { chmod, lstat, mkdir, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { isAbsolute, join, relative } from 'node:path';

import { TRANSCEND_MCP_CONFIG_DIR_ENV } from '../constants.js';

/** Returns true when `error` is a Node filesystem error with the given code. */
export function isErrnoException(error: unknown, code: string): boolean {
  return error instanceof Error && 'code' in error && error.code === code;
}

/**
 * Directory that holds the credentials file and the refresh locks:
 * `TRANSCEND_MCP_CONFIG_DIR`, or `~/.transcend/mcp`.
 *
 * The override must be an absolute path. MCP hosts do not expand `~`, and a
 * relative path would put the saved login under the server's working directory,
 * which can be a repository.
 */
export function resolveMcpConfigDirectory(env: NodeJS.ProcessEnv = process.env): string {
  const override = env[TRANSCEND_MCP_CONFIG_DIR_ENV]?.trim();
  if (!override) return join(homedir(), '.transcend', 'mcp');
  if (!isAbsolute(override)) {
    throw new Error(
      `${TRANSCEND_MCP_CONFIG_DIR_ENV} must be an absolute path, got "${override}". ` +
        'Write the full path; "~" and relative paths are not expanded.',
    );
  }
  return override;
}

/** Returns true when `path` is `parent` or sits inside it. */
function isInsideDirectory(parent: string, path: string): boolean {
  const fromParent = relative(parent, path);
  return fromParent === '' || (!fromParent.startsWith('..') && !isAbsolute(fromParent));
}

/**
 * Creates `directory` if needed and restricts it to its owner.
 *
 * Fails closed when the path is a symlink or a file, or when another user owns
 * it, so the mode change never reaches a directory this user does not own.
 * Windows ignores POSIX mode bits and inherits the parent's access list, so
 * there the directory must sit inside the user profile.
 */
export async function ensurePrivateDirectory(
  directory: string,
  platform: NodeJS.Platform = process.platform,
): Promise<void> {
  if (platform === 'win32' && !isInsideDirectory(homedir(), directory)) {
    throw new Error(
      `${directory} is outside your user profile, and Windows does not enforce owner-only access there. ` +
        `Set ${TRANSCEND_MCP_CONFIG_DIR_ENV} to a folder inside ${homedir()}.`,
    );
  }

  await mkdir(directory, { recursive: true, mode: 0o700 });
  const stats = await lstat(directory);
  if (!stats.isDirectory()) {
    throw new Error(`${directory} must be a real directory, not a symlink or a file.`);
  }
  if (typeof process.getuid === 'function' && stats.uid !== process.getuid()) {
    throw new Error(`${directory} is owned by another user.`);
  }
  await chmod(directory, 0o700);
}

/** Reads a file as text, or returns `null` when it does not exist. */
export async function readFileIfExists(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if (isErrnoException(error, 'ENOENT')) return null;
    throw error;
  }
}
