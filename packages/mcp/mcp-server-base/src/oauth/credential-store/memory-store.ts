import type { StoredOAuthTokens } from '../types.js';
import { isCredentialStoreKeyFor } from './stored-tokens.js';
import { CredentialStoreKind, type CredentialStore } from './types.js';

/**
 * Keeps logins in this process only. Nothing is written, so the login ends when
 * the process does, and no other process can spend its refresh token.
 */
export function createMemoryCredentialStore(): CredentialStore {
  const entries = new Map<string, StoredOAuthTokens>();
  /** End of the queue of refreshes for each key, so two token managers cannot refresh together. */
  const lockQueues = new Map<string, Promise<void>>();
  return {
    kind: CredentialStoreKind.Memory,
    location: 'process memory (not saved)',
    load: async (key) => {
      const tokens = entries.get(key);
      // A copy, so a caller cannot change the saved login without saving it.
      return tokens && isCredentialStoreKeyFor(key, tokens) ? { ...tokens } : null;
    },
    save: async (key, tokens) => {
      if (!isCredentialStoreKeyFor(key, tokens)) {
        throw new Error('The login does not belong to the key it is saved under');
      }
      entries.set(key, { ...tokens });
    },
    clear: async (key) => {
      entries.delete(key);
    },
    keys: async () => [...entries.keys()],
    withRefreshLock: (key, task) => {
      const run = (lockQueues.get(key) ?? Promise.resolve()).then(task);
      const tail = run.then(
        () => undefined,
        () => undefined,
      );
      lockQueues.set(key, tail);
      void tail.then(() => {
        if (lockQueues.get(key) === tail) lockQueues.delete(key);
      });
      return run;
    },
  };
}
