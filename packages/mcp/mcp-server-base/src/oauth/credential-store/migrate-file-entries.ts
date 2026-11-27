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
 * file cannot be left holding a token the keychain copy has already replaced. A
 * login that is already in the keychain is kept, and the file copy is dropped.
 * A failure is logged and retried at the next startup.
 */
export async function migrateFileEntriesToKeyring(
  options: MigrateFileEntriesOptions,
): Promise<void> {
  const { fileStore, keyringStore, logger } = options;
  try {
    for (const key of await fileStore.keys()) {
      await keyringStore.withRefreshLock(key, async () => {
        const tokens = await fileStore.load(key);
        if (!tokens) return;
        if ((await keyringStore.load(key)) === null) await keyringStore.save(key, tokens);
        await fileStore.clear(key);
      });
    }
  } catch (error) {
    logger.warn('Could not move the saved MCP login from the file into the OS keychain', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
