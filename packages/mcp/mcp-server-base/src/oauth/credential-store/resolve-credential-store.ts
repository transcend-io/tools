import type { Logger } from '../../clients/graphql/base.js';
import { TRANSCEND_MCP_CREDENTIAL_STORE_ENV } from '../constants.js';
import { resolveMcpConfigDirectory } from './config-directory.js';
import { createFileCredentialStore } from './file-store.js';
import { createKeyringCredentialStore, KEYRING_SERVICE, loadOsKeyring } from './keyring-store.js';
import { createMemoryCredentialStore } from './memory-store.js';
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
 * and otherwise the owner-only file. `keyring` never falls back: asking for the
 * keychain and silently getting a file would be a weaker store than requested.
 */
export async function resolveCredentialStore(
  options: ResolveCredentialStoreOptions,
): Promise<CredentialStore> {
  const { logger, env = process.env, loadKeyring = loadOsKeyring } = options;
  const kind = parseCredentialStoreKind(env[TRANSCEND_MCP_CREDENTIAL_STORE_ENV]);
  const directory = resolveMcpConfigDirectory(env);

  if (kind === CredentialStoreKind.Memory) return createMemoryCredentialStore();
  if (kind === CredentialStoreKind.File) return createFileCredentialStore({ directory, logger });

  try {
    const keyring = await loadKeyring();
    await keyring.get(KEYRING_SERVICE, KEYRING_PROBE_ACCOUNT);
    return createKeyringCredentialStore({ keyring, lockDirectory: directory, logger });
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
    logger.warn('The OS keychain is not available; saving the MCP login to an owner-only file', {
      error: detail,
      filePath: fileStore.location,
    });
    return fileStore;
  }
}
