import type { Logger } from '../../clients/graphql/base.js';
import { TRANSCEND_MCP_CREDENTIAL_STORE_ENV } from '../constants.js';
import { resolveMcpConfigDirectory } from './config-directory.js';
import { createFallbackCredentialStore } from './fallback-store.js';
import { createFileCredentialStore } from './file-store.js';
import { createKeyringCredentialStore, KEYRING_SERVICE, loadOsKeyring } from './keyring-store.js';
import { createMemoryCredentialStore } from './memory-store.js';
import { migrateFileEntriesToKeyring } from './migrate-file-entries.js';
import { CredentialStoreKind, type CredentialStore, type Keyring } from './types.js';

/** Account read once at startup to learn whether the keychain answers. Never written. */
const KEYRING_PROBE_ACCOUNT = 'availability-probe';

export interface ResolveCredentialStoreOptions {
  /** Logger for the fallback from the keychain to the file */
  logger: Logger;
  /** Environment to read the store kind and config directory from */
  env?: NodeJS.ProcessEnv;
  /** Loads the OS keychain binding; rejects when the platform has none */
  loadKeyring?: () => Promise<Keyring>;
  /** Platform that decides how the file fallback is described */
  platform?: NodeJS.Platform;
  /**
   * Directory for the keychain's refresh locks. Defaults to the per-user
   * directory and ignores the config directory override: the keychain is shared
   * by every process of this user, so its lock must be too.
   */
  keyringLockDirectory?: string;
}

/** The store this process uses, and every store that may hold a login. */
export interface ResolvedCredentialStores {
  /** Store this process loads from and saves to */
  active: CredentialStore;
  /**
   * Every store that may hold a login, starting with `active`. In `auto` and
   * `keyring` mode the file is listed even when the keychain is active, so
   * `status` and `logout` cover a login that the file still holds.
   */
  all: CredentialStore[];
  /** Why `auto` mode did not use the keychain; unset when it did or was not asked to */
  keychainUnavailable?: string;
}

/**
 * Reads a `TRANSCEND_MCP_CREDENTIAL_STORE` value. Unset means `auto`.
 *
 * @throws Error when the value names no store
 */
export function parseCredentialStoreKind(raw: string | undefined): CredentialStoreKind {
  const value = raw?.trim().toLowerCase();
  if (!value) return CredentialStoreKind.Auto;
  const kind = Object.values(CredentialStoreKind).find((candidate) => candidate === value);
  if (!kind) {
    throw new Error(
      `${TRANSCEND_MCP_CREDENTIAL_STORE_ENV} must be one of ` +
        `${Object.values(CredentialStoreKind).join(', ')}; got "${raw}"`,
    );
  }
  return kind;
}

/**
 * Picks where the OAuth login is saved, from `TRANSCEND_MCP_CREDENTIAL_STORE`.
 *
 * `auto` (the default) uses the OS keychain when it loads and answers a read,
 * and otherwise a file in the config directory. `keyring` never falls back:
 * asking for the keychain and silently getting a file would be a weaker store
 * than requested. When `auto` picks the keychain, logins that an earlier run
 * saved to the file move into the keychain, and a keychain that fails later
 * falls back to the file for that read or save.
 */
export async function resolveCredentialStores(
  options: ResolveCredentialStoreOptions,
): Promise<ResolvedCredentialStores> {
  const {
    logger,
    env = process.env,
    loadKeyring = loadOsKeyring,
    platform = process.platform,
    keyringLockDirectory = resolveMcpConfigDirectory({}),
  } = options;
  const kind = parseCredentialStoreKind(env[TRANSCEND_MCP_CREDENTIAL_STORE_ENV]);

  if (kind === CredentialStoreKind.Memory) {
    const active = createMemoryCredentialStore();
    return { active, all: [active] };
  }

  const directory = resolveMcpConfigDirectory(env);
  if (kind === CredentialStoreKind.File) {
    const active = createFileCredentialStore({ directory, logger });
    return { active, all: [active] };
  }

  try {
    const keyring = await loadKeyring();
    await keyring.get(KEYRING_SERVICE, KEYRING_PROBE_ACCOUNT);
    const keyringStore = createKeyringCredentialStore({
      keyring,
      lockDirectory: keyringLockDirectory,
      logger,
    });
    const fileStore = createFileCredentialStore({ directory, logger });
    // `keyring` never writes the file, but `logout` must still clear a login left in it.
    if (kind === CredentialStoreKind.Keyring) {
      return { active: keyringStore, all: [keyringStore, fileStore] };
    }

    const lockBothStores = keyringLockDirectory !== directory;
    await migrateFileEntriesToKeyring({
      fileStore,
      keyringStore,
      logger,
      lockBothStores,
    });
    const active = createFallbackCredentialStore({
      primary: keyringStore,
      fallback: fileStore,
      logger,
      lockBothStores,
    });
    return { active, all: [active, fileStore] };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    if (kind === CredentialStoreKind.Keyring) {
      throw new Error(
        `${TRANSCEND_MCP_CREDENTIAL_STORE_ENV}=${CredentialStoreKind.Keyring} but the OS ` +
          `keychain is not available: ${detail}`,
        { cause: error },
      );
    }
    const fileStore = createFileCredentialStore({ directory, logger });
    const fileDescription =
      platform === 'win32' ? 'a file in your user profile' : 'an owner-only file';
    logger.warn(`The OS keychain is not available; saving the MCP login to ${fileDescription}`, {
      error: detail,
      filePath: fileStore.location,
    });
    return { active: fileStore, all: [fileStore], keychainUnavailable: detail };
  }
}

/** Same as {@link resolveCredentialStores}, for callers that need only the active store. */
export async function resolveCredentialStore(
  options: ResolveCredentialStoreOptions,
): Promise<CredentialStore> {
  return (await resolveCredentialStores(options)).active;
}
