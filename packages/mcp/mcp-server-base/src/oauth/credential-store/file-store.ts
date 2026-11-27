import { randomUUID } from 'node:crypto';
import { constants, lstat, open, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';

import { z } from 'zod';

import type { Logger } from '../../clients/graphql/base.js';
import type { StoredOAuthTokens } from '../types.js';
import { ensurePrivateDirectory, isErrnoException } from './config-directory.js';
import { refreshLockPath, withLockFile } from './refresh-lock.js';
import { parseStoredOAuthTokens } from './stored-tokens.js';
import { CredentialStoreKind, type CredentialStore } from './types.js';

const CREDENTIALS_FILE_NAME = 'credentials.json';

const CredentialsFileSchema = z.record(z.string(), z.unknown());

export interface FileCredentialStoreOptions {
  /** Directory that holds the credentials file and its locks */
  directory: string;
  /** Logger for a credentials file that is ignored */
  logger: Logger;
}

/**
 * Reads the credentials file, or returns `null` when it is missing or must not
 * be trusted.
 *
 * The permission check runs on the opened handle, and a symlink is refused, so
 * the file that is checked is the file that is read.
 */
async function readOwnerOnlyFile(filePath: string, logger: Logger): Promise<string | null> {
  let handle: Awaited<ReturnType<typeof open>>;
  try {
    // O_NOFOLLOW is undefined on Windows, where the checks below do not apply either.
    handle = await open(filePath, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  } catch (error) {
    if (isErrnoException(error, 'ENOENT')) return null;
    if (isErrnoException(error, 'ELOOP')) {
      logger.warn('Ignoring the saved MCP login: the credentials file is a symlink', { filePath });
      return null;
    }
    throw error;
  }

  try {
    const stats = await handle.stat();
    const userId = process.getuid?.();
    const isOwnerOnly =
      stats.isFile() &&
      (userId === undefined || (stats.uid === userId && (stats.mode & 0o077) === 0));
    if (!isOwnerOnly) {
      logger.warn(
        'Ignoring the saved MCP login: the credentials file must be a regular file that only ' +
          'its owner can read. Sign in again to replace it.',
        { filePath },
      );
      return null;
    }
    return await handle.readFile('utf8');
  } finally {
    await handle.close();
  }
}

function parseCredentialsFile(raw: string): Record<string, unknown> {
  try {
    const parsed = CredentialsFileSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : {};
  } catch (error) {
    if (error instanceof SyntaxError) return {};
    throw error;
  }
}

/**
 * Saves logins in `credentials.json`, readable only by its owner.
 *
 * Every write goes to a temporary file that is then renamed into place, so a
 * reader never sees half a file. A missing, unreadable, or corrupt file means
 * "no login" and is replaced by the next save.
 */
export function createFileCredentialStore(options: FileCredentialStoreOptions): CredentialStore {
  const { directory, logger } = options;
  const filePath = join(directory, CREDENTIALS_FILE_NAME);
  const writeLockPath = `${filePath}.lock`;

  const readEntries = async (): Promise<Record<string, unknown>> => {
    const raw = await readOwnerOnlyFile(filePath, logger);
    return raw === null ? {} : parseCredentialsFile(raw);
  };

  const writeEntries = async (entries: Record<string, unknown>): Promise<void> => {
    await ensurePrivateDirectory(directory);
    const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
    try {
      const handle = await open(temporaryPath, 'wx', 0o600);
      try {
        await handle.writeFile(JSON.stringify(entries, null, 2));
        await handle.sync();
      } finally {
        await handle.close();
      }
      await rename(temporaryPath, filePath);
    } catch (error) {
      await rm(temporaryPath, { force: true });
      throw error;
    }
  };

  /** Serializes read-modify-write cycles, so two processes cannot drop each other's entry. */
  const updateEntries = (change: (entries: Record<string, unknown>) => void): Promise<void> =>
    withLockFile(writeLockPath, async () => {
      const entries = await readEntries();
      change(entries);
      await writeEntries(entries);
    });

  const fileExists = async (): Promise<boolean> => {
    try {
      await lstat(filePath);
      return true;
    } catch (error) {
      if (isErrnoException(error, 'ENOENT')) return false;
      throw error;
    }
  };

  const clear = async (key: string): Promise<void> => {
    // Rewrites any file that exists, so an untrusted or corrupt one is replaced too.
    if (!(await fileExists())) return;
    await updateEntries((entries) => {
      delete entries[key];
    });
  };

  return {
    kind: CredentialStoreKind.File,
    location: filePath,
    load: async (key: string): Promise<StoredOAuthTokens | null> => {
      const entries = await readEntries();
      if (!Object.hasOwn(entries, key)) return null;
      const tokens = parseStoredOAuthTokens(entries[key], key);
      if (!tokens) {
        logger.warn('Dropping a saved MCP login that could not be read', { filePath });
        await clear(key);
      }
      return tokens;
    },
    save: (key, tokens) =>
      updateEntries((entries) => {
        entries[key] = tokens;
      }),
    clear,
    keys: async () => Object.keys(await readEntries()),
    withRefreshLock: (key, task) => withLockFile(refreshLockPath(directory, key), task),
  };
}
