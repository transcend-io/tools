import type { Logger } from '../../clients/graphql/base.js';
import type { CredentialStore } from './types.js';

export interface MigrateFileEntriesOptions {
  /** Store that the logins move out of */
  fileStore: CredentialStore;
  /** Store that the logins move into */
  keyringStore: CredentialStore;
  /** Logger for a migration that fails */
  logger: Logger;
}

/**
 * Moves logins saved in the file into the keychain.
 *
 * A login lands in the file when the keychain is unavailable at one startup. A
 * later startup with a working keychain would otherwise never read, list, or
 * clear it, and `logout` would leave its refresh token live on disk.
 *
 * Each key moves under its refresh lock, so a process still refreshing from the
 * file cannot be left holding a token the keychain copy has already replaced. When
 * both stores hold a login, the one that expires later is kept, because it came
 * from the later refresh; the other copy is dropped. A key that fails is logged
 * and retried at the next startup, and does not stop the other keys.
 */
export async function migrateFileEntriesToKeyring(
  options: MigrateFileEntriesOptions,
): Promise<void> {
  const { fileStore, keyringStore, logger } = options;
  let keys: string[];
  try {
    keys = await fileStore.keys();
  } catch (error) {
    logger.warn('Could not read the saved MCP logins in the file', { error: describe(error) });
    return;
  }

  for (const key of keys) {
    try {
      await keyringStore.withRefreshLock(key, async () => {
        const fileTokens = await fileStore.load(key);
        if (!fileTokens) return;
        const keyringTokens = await keyringStore.load(key);
        if (keyringTokens === null || fileTokens.expiresAt > keyringTokens.expiresAt) {
          await keyringStore.save(key, fileTokens);
        }
        await fileStore.clear(key);
      });
    } catch (error) {
      logger.warn('Could not move a saved MCP login from the file into the OS keychain', {
        error: describe(error),
      });
    }
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
