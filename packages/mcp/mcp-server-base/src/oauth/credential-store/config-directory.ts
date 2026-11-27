import { chmod, mkdir, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { TRANSCEND_MCP_CONFIG_DIR_ENV } from '../constants.js';

/** Returns true when `error` is a Node filesystem error with the given code. */
export function isErrnoException(error: unknown, code: string): boolean {
  return error instanceof Error && 'code' in error && error.code === code;
}

/**
 * Directory that holds the credentials file and the refresh locks:
 * `TRANSCEND_MCP_CONFIG_DIR`, or `~/.transcend/mcp`.
 */
export function resolveMcpConfigDirectory(env: NodeJS.ProcessEnv = process.env): string {
  return env[TRANSCEND_MCP_CONFIG_DIR_ENV]?.trim() || join(homedir(), '.transcend', 'mcp');
}

/** Creates `directory` if needed and restricts it to its owner. */
export async function ensurePrivateDirectory(directory: string): Promise<void> {
  await mkdir(directory, { recursive: true, mode: 0o700 });
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
