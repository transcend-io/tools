import type { EntryOptions } from '@napi-rs/keyring';

import type { Logger } from '../../clients/graphql/base.js';
import { refreshLockPath, withLockFile } from './refresh-lock.js';
import { parseSerializedOAuthTokens, toStoredOAuthTokensEntry } from './stored-tokens.js';
import { CredentialStoreKind, type CredentialStore, type Keyring } from './types.js';

/** Keychain service name every saved login is filed under. */
export const KEYRING_SERVICE = 'transcend-mcp';

/**
 * Pins Linux entries to Secret Service. Without this the library silently falls
 * back to the kernel keyring for reads and writes, while listing still needs
 * Secret Service, so `logout` could not see a saved login. Pinned, an
 * unavailable Secret Service throws, and `auto` falls back to the owner-only file.
 */
const ENTRY_OPTIONS: EntryOptions = { linux: { store: 'secret-service' } };

export interface KeyringCredentialStoreOptions {
  /** Keychain to read and write */
  keyring: Keyring;
  /** Directory for the refresh lock files; the keychain itself cannot lock */
  lockDirectory: string;
  /** Logger for an entry that is dropped */
  logger: Logger;
}

/**
 * Loads the OS keychain binding.
 *
 * `@napi-rs/keyring` is an optional dependency with a native binary per
 * platform, so it is imported only when asked for. A platform without a binary
 * rejects here instead of failing at startup.
 */
export async function loadOsKeyring(): Promise<Keyring> {
  const { AsyncEntry, findCredentialsAsync } = await import('@napi-rs/keyring');
  return {
    get: (service, account) => new AsyncEntry(service, account, ENTRY_OPTIONS).getPassword(),
    set: (service, account, secret) =>
      new AsyncEntry(service, account, ENTRY_OPTIONS).setPassword(secret),
    delete: async (service, account) => {
      await new AsyncEntry(service, account, ENTRY_OPTIONS).deleteCredential();
    },
    accounts: async (service) =>
      (await findCredentialsAsync(service)).map(({ account }) => account),
  };
}

/** Saves logins in the OS keychain, one entry per key. */
export function createKeyringCredentialStore(
  options: KeyringCredentialStoreOptions,
): CredentialStore {
  const { keyring, lockDirectory, logger } = options;
  return {
    kind: CredentialStoreKind.Keyring,
    location: `OS keychain (service "${KEYRING_SERVICE}")`,
    load: async (key) => {
      const raw = await keyring.get(KEYRING_SERVICE, key);
      if (raw === null) return null;
      const tokens = parseSerializedOAuthTokens(raw, key);
      if (!tokens) {
        logger.warn('Dropping a saved MCP login that could not be read');
        await keyring.delete(KEYRING_SERVICE, key);
      }
      return tokens;
    },
    save: (key, tokens) =>
      keyring.set(KEYRING_SERVICE, key, JSON.stringify(toStoredOAuthTokensEntry(tokens, key))),
    clear: (key) => keyring.delete(KEYRING_SERVICE, key),
    keys: () => keyring.accounts(KEYRING_SERVICE),
    withRefreshLock: (key, task) => withLockFile(refreshLockPath(lockDirectory, key), task),
  };
}
