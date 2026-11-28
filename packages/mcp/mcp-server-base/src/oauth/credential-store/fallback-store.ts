import type { Logger } from '../../clients/graphql/base.js';
import type { StoredOAuthTokens } from '../types.js';
import type { AssertLockHeld } from './refresh-lock.js';
import type { CredentialStore } from './types.js';

export interface FallbackCredentialStoreOptions {
  /** Store used first: the OS keychain */
  primary: CredentialStore;
  /** Store used when the primary fails or has no entry: the owner-only file */
  fallback: CredentialStore;
  /** Logger for the switch to the fallback */
  logger: Logger;
  /**
   * When true, take the keychain lock and the file lock before a refresh or a
   * migration step. Set when the two stores use different lock directories.
   */
  lockBothStores?: boolean;
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Returns the login with the later `expiresAt`, or the keychain copy on a tie. */
function preferNewerLogin(
  key: string,
  keychain: StoredOAuthTokens,
  file: StoredOAuthTokens,
  logger: Logger,
): StoredOAuthTokens {
  if (file.expiresAt <= keychain.expiresAt) return keychain;
  logger.warn(
    'The saved MCP login in the owner-only file has a later expiry than the OS keychain copy; using the file',
    { credentialStoreKey: key },
  );
  return file;
}

async function withBothRefreshLocks<T>(
  primary: CredentialStore,
  fallback: CredentialStore,
  key: string,
  task: (assertHeld: AssertLockHeld) => Promise<T>,
): Promise<T> {
  return primary.withRefreshLock(key, async (assertPrimary) =>
    fallback.withRefreshLock(key, async (assertFallback) => {
      const assertHeld: AssertLockHeld = async () => {
        await assertPrimary();
        await assertFallback();
      };
      return task(assertHeld);
    }),
  );
}

/**
 * Uses `primary`, and falls back to `fallback` when the primary fails.
 *
 * The keychain can answer at startup and refuse later (a locked keychain, a
 * closed prompt). Without a fallback, a refresh would spend the rotated refresh
 * token, fail to save it, and lose the login. Here the rotated token goes to the
 * file, and the next startup moves it back into the keychain.
 */
export function createFallbackCredentialStore(
  options: FallbackCredentialStoreOptions,
): CredentialStore {
  const { primary, fallback, logger, lockBothStores = false } = options;
  const warnAndFallBack = (action: string, error: unknown): void => {
    logger.warn(`The OS keychain failed to ${action}; using the owner-only file instead`, {
      error: describe(error),
      filePath: fallback.location,
    });
  };

  const withRefreshLock = <T>(key: string, task: (assertHeld: AssertLockHeld) => Promise<T>) =>
    lockBothStores
      ? withBothRefreshLocks(primary, fallback, key, task)
      : primary.withRefreshLock(key, task);

  const loadFromBoth = async (key: string): Promise<StoredOAuthTokens | null> => {
    let keychain: StoredOAuthTokens | null = null;
    let keychainError: unknown;
    try {
      keychain = await primary.load(key);
    } catch (error) {
      keychainError = error;
      warnAndFallBack('read the saved login', error);
    }

    let file: StoredOAuthTokens | null = null;
    try {
      file = await fallback.load(key);
    } catch (error) {
      logger.warn('Could not read the saved login from the owner-only file', {
        error: describe(error),
        filePath: fallback.location,
      });
    }

    if (keychain && file) return preferNewerLogin(key, keychain, file, logger);
    if (keychain) return keychain;
    if (file) return file;
    if (keychainError !== undefined) throw keychainError;
    return null;
  };

  return {
    kind: primary.kind,
    location: primary.location,
    load: loadFromBoth,
    save: async (key, tokens) => {
      try {
        await primary.save(key, tokens);
        await fallback.clear(key).catch((error: unknown) => {
          logger.warn('Could not remove the saved login from the owner-only file', {
            error: describe(error),
            filePath: fallback.location,
          });
        });
      } catch (error) {
        warnAndFallBack('save the login', error);
        await fallback.save(key, tokens);
        await primary.clear(key).catch((clearError: unknown) => {
          logger.warn('Could not remove the outdated login from the OS keychain', {
            error: describe(clearError),
          });
        });
      }
    },
    clear: async (key) => {
      let primaryError: unknown;
      try {
        await primary.clear(key);
      } catch (error) {
        primaryError = error;
      }
      await fallback.clear(key);
      if (primaryError !== undefined) throw primaryError;
    },
    // The file is listed on its own by the caller, so do not hide a keychain listing failure.
    keys: async () => {
      try {
        return await primary.keys();
      } catch (error) {
        warnAndFallBack('list the saved logins', error);
        throw error;
      }
    },
    withRefreshLock,
  };
}

/** Runs `task` under the same refresh locks the fallback store would use. */
export async function withFallbackRefreshLock<T>(
  options: Pick<FallbackCredentialStoreOptions, 'primary' | 'fallback' | 'lockBothStores'>,
  key: string,
  task: (assertHeld: AssertLockHeld) => Promise<T>,
): Promise<T> {
  const { primary, fallback, lockBothStores = false } = options;
  return lockBothStores
    ? withBothRefreshLocks(primary, fallback, key, task)
    : primary.withRefreshLock(key, task);
}
