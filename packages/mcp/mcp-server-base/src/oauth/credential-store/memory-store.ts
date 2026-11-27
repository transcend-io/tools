import type { StoredOAuthTokens } from '../types.js';
import { CredentialStoreKind, type CredentialStore } from './types.js';

/**
 * Keeps logins in this process only. Nothing is written, so the login ends when
 * the process does, and no other process can spend its refresh token.
 */
export function createMemoryCredentialStore(): CredentialStore {
  const entries = new Map<string, StoredOAuthTokens>();
  return {
    kind: CredentialStoreKind.Memory,
    location: 'process memory (not saved)',
    load: async (key) => entries.get(key) ?? null,
    save: async (key, tokens) => {
      entries.set(key, tokens);
    },
    clear: async (key) => {
      entries.delete(key);
    },
    keys: async () => [...entries.keys()],
    withRefreshLock: (_key, task) => task(async () => undefined),
  };
}
