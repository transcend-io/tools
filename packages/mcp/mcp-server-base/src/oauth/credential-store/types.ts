import type { StoredOAuthTokens } from '../types.js';
import type { AssertLockHeld } from './refresh-lock.js';

/** Where the OAuth login is saved, as accepted by `TRANSCEND_MCP_CREDENTIAL_STORE`. */
export enum CredentialStoreKind {
  /** OS keychain when it is reachable, otherwise the owner-only file */
  Auto = 'auto',
  /** OS keychain only */
  Keyring = 'keyring',
  /** Owner-only file under the config directory */
  File = 'file',
  /** This process only; nothing is written */
  Memory = 'memory',
}

/**
 * Saved OAuth logins, one entry per issuer and client.
 *
 * Keys come from `credentialStoreKey`, so they stay the same across restarts.
 */
export interface CredentialStore {
  /** Backend that holds the entries; never {@link CredentialStoreKind.Auto} */
  kind: CredentialStoreKind;
  /** Where the entries live, worded for a person */
  location: string;
  /** Returns the entry saved under `key`, or `null` when there is no usable one */
  load: (key: string) => Promise<StoredOAuthTokens | null>;
  /** Saves `tokens` under `key`, replacing any earlier entry */
  save: (key: string, tokens: StoredOAuthTokens) => Promise<void>;
  /** Removes the entry saved under `key`; a missing entry is not an error */
  clear: (key: string) => Promise<void>;
  /** Lists the key of every saved entry */
  keys: () => Promise<string[]>;
  /**
   * Runs `task` while no other process sharing this store can refresh `key`.
   * Refresh tokens rotate, so two processes must never spend the same one.
   *
   * `task` receives {@link AssertLockHeld}. Call it before the token request and
   * before the save, because a holder that was suspended can lose its lock.
   */
  withRefreshLock: <T>(key: string, task: (assertHeld: AssertLockHeld) => Promise<T>) => Promise<T>;
}

/** The slice of an OS keychain the store uses. */
export interface Keyring {
  /** Returns the secret for `account`, or `null` when there is none */
  get: (service: string, account: string) => Promise<string | null>;
  /** Saves `secret` for `account` */
  set: (service: string, account: string, secret: string) => Promise<void>;
  /** Deletes the entry for `account`; a missing entry is not an error */
  delete: (service: string, account: string) => Promise<void>;
  /** Lists every account saved under `service` */
  accounts: (service: string) => Promise<string[]>;
}
