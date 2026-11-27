import type { Logger } from '../../clients/graphql/base.js';
import type { CredentialStore } from './types.js';

export interface FallbackCredentialStoreOptions {
  /** Store used first: the OS keychain */
  primary: CredentialStore;
  /** Store used when the primary fails or has no entry: the owner-only file */
  fallback: CredentialStore;
  /** Logger for the switch to the fallback */
  logger: Logger;
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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
  const { primary, fallback, logger } = options;
  const warnAndFallBack = (action: string, error: unknown): void => {
    logger.warn(`The OS keychain failed to ${action}; using the owner-only file instead`, {
      error: describe(error),
      filePath: fallback.location,
    });
  };

  return {
    kind: primary.kind,
    location: primary.location,
    load: async (key) => {
      try {
        const tokens = await primary.load(key);
        if (tokens) return tokens;
      } catch (error) {
        warnAndFallBack('read the saved login', error);
      }
      return fallback.load(key);
    },
    save: async (key, tokens) => {
      try {
        await primary.save(key, tokens);
      } catch (error) {
        warnAndFallBack('save the login', error);
        await fallback.save(key, tokens);
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
    // The file is listed on its own by the caller, so list it here only when the keychain fails.
    keys: async () => {
      try {
        return await primary.keys();
      } catch (error) {
        warnAndFallBack('list the saved logins', error);
        return fallback.keys();
      }
    },
    withRefreshLock: (key, task) => primary.withRefreshLock(key, task),
  };
}
