import { McpToolErrorCode } from '@transcend-io/privacy-types';

import type { OAuthTokenAuth } from '../auth.js';
import { SimpleLogger, type Logger } from '../clients/graphql/base.js';
import { ToolError } from '../errors.js';
import { getOAuthClientIdFromEnv, getOAuthClientSecret } from './config.js';
import { resolveCredentialStore } from './credential-store/resolve-credential-store.js';
import { credentialStoreKey, isCredentialStoreKeyFor } from './credential-store/stored-tokens.js';
import type { CredentialStore } from './credential-store/types.js';
import { fetchAuthorizationServerMetadata } from './metadata.js';
import { getOAuthScopes } from './scopes.js';
import { refreshOAuthTokens } from './token-refresh.js';
import { OAUTH_INVALID_GRANT_ERROR, OAuthTokenRequestError } from './token-request.js';
import { isStoredOAuthTokenValid, storedOAuthTokensToAuth } from './token-store.js';
import type { StoredOAuthTokens } from './types.js';

/** The OAuth client a login belongs to, and what the login is asked to cover. */
export interface OAuthClientCredentials {
  /** OAuth authorization server issuer URL */
  issuer: string;
  /** OAuth client identifier */
  clientId: string;
  /** OAuth client secret */
  clientSecret: string;
  /** Scopes this server asks for at sign-in */
  scopes: readonly string[];
}

export interface OAuthTokenManagerOptions {
  /** Where the login is saved, or a function that resolves it on first use */
  store: CredentialStore | (() => Promise<CredentialStore>);
  /** Clock; defaults to `Date.now` */
  now?: () => number;
  /** Fetch implementation; defaults to the global `fetch` */
  fetch?: typeof fetch;
}

/** Holds one OAuth login: in memory, in the credential store, and refreshed on demand. */
export interface OAuthTokenManager {
  /** Tokens held in this process, valid or not */
  getActiveStoredTokens: () => StoredOAuthTokens | null;
  /** Credentials for the tokens held in this process */
  getActiveCredentials: () => OAuthTokenAuth | null;
  /** Replaces the tokens held in this process without saving them */
  setActiveStoredTokens: (tokens: StoredOAuthTokens | null) => void;
  /** Keeps the tokens of a new sign-in in this process and saves them for later processes */
  saveTokens: (
    client: OAuthClientCredentials,
    tokens: StoredOAuthTokens,
    logger: Logger,
  ) => Promise<void>;
  /**
   * Returns usable credentials, loading the saved login and refreshing the
   * access token when needed. Returns `null` when the user has to sign in.
   *
   * @throws ToolError when a refresh fails for a reason other than a rejected
   * refresh token. The saved login is kept.
   */
  getValidCredentials: (
    client: OAuthClientCredentials,
    logger: Logger,
  ) => Promise<OAuthTokenAuth | null>;
  /** Forgets everything held in this process (for tests) */
  reset: () => void;
}

/** A login held in this process. */
interface ActiveLogin {
  /** Tokens of the login */
  tokens: StoredOAuthTokens;
  /** Store key the login belongs to; `null` when it was set directly, for any scopes of its client */
  key: string | null;
  /** Whether the store holds these tokens, so another process may have rotated them */
  isSaved: boolean;
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Turns a failed refresh into a tool error that says whether a retry can help.
 *
 * No answer, a 5xx, a rate limit, and a busy refresh lock all pass on their own.
 * Any other answer from the token endpoint needs a person to fix the client.
 */
function toRefreshToolError(error: unknown): ToolError {
  if (error instanceof ToolError) return error;
  const isRejected =
    error instanceof OAuthTokenRequestError && error.status < 500 && error.status !== 429;
  if (isRejected) {
    return new ToolError(McpToolErrorCode.AuthError, describeError(error), false);
  }
  return new ToolError(
    McpToolErrorCode.ApiError,
    `Could not refresh the Transcend sign-in: ${describeError(error)}. ` +
      'The saved login was kept. Retry in a moment.',
    true,
  );
}

/**
 * Creates a token manager over a credential store.
 *
 * Refresh tokens rotate on every use, and the server revokes the whole grant
 * when an old one is presented. So a refresh always runs under the store's
 * lock, after re-reading the store: if another process already rotated the
 * token, this one adopts the result instead of spending the old token.
 */
export function createOAuthTokenManager(options: OAuthTokenManagerOptions): OAuthTokenManager {
  const now = options.now ?? (() => Date.now());

  let active: ActiveLogin | null = null;
  let refreshPromise: Promise<OAuthTokenAuth | null> | null = null;
  let storePromise: Promise<CredentialStore> | null = null;

  const getStore = (): Promise<CredentialStore> => {
    if (!storePromise) {
      const { store } = options;
      const pending = typeof store === 'function' ? store() : Promise.resolve(store);
      storePromise = pending;
      pending.catch(() => {
        if (storePromise === pending) storePromise = null;
      });
    }
    return storePromise;
  };

  const tokensInMemory = (key: string): StoredOAuthTokens | null => {
    if (!active) return null;
    const isForKey =
      active.key === null ? isCredentialStoreKeyFor(key, active.tokens) : active.key === key;
    return isForKey ? active.tokens : null;
  };

  const save = async (key: string, tokens: StoredOAuthTokens, logger: Logger): Promise<void> => {
    try {
      const store = await getStore();
      await store.save(key, tokens);
      active = { tokens, key, isSaved: true };
    } catch (error) {
      active = { tokens, key, isSaved: false };
      logger.warn(
        'Could not save the Transcend sign-in. It will last until this process exits. ' +
          'Set TRANSCEND_MCP_CREDENTIAL_STORE=file to save it to an owner-only file instead.',
        { error: describeError(error) },
      );
      // The store may still hold the refresh token that was just spent. Another
      // process that used it would get the whole grant revoked.
      await getStore()
        .then((store) => store.clear(key))
        .catch((clearError: unknown) => {
          logger.warn('Could not remove the outdated saved sign-in', {
            error: describeError(clearError),
          });
        });
    }
  };

  const signOut = async (key: string): Promise<void> => {
    active = null;
    const store = await getStore();
    await store.clear(key);
  };

  /** Tokens for `key`: the ones in memory, else the saved login. */
  const loadTokens = async (key: string, logger: Logger): Promise<StoredOAuthTokens | null> => {
    const held = tokensInMemory(key);
    if (held) return held;
    // A store that cannot be opened is a configuration error, not a missing login.
    const store = await getStore();
    try {
      const tokens = await store.load(key);
      active = tokens && { tokens, key, isSaved: true };
    } catch (error) {
      // Nothing is held in memory, so nothing can be spent twice. Signing in
      // again starts a new grant.
      logger.warn('Could not read the saved Transcend sign-in; a new sign-in is needed', {
        error: describeError(error),
      });
      active = null;
    }
    return active?.tokens ?? null;
  };

  const refreshUnderLock = async (
    key: string,
    client: OAuthClientCredentials,
    expired: StoredOAuthTokens,
    logger: Logger,
  ): Promise<OAuthTokenAuth | null> => {
    const metadata = await fetchAuthorizationServerMetadata(client.issuer, options.fetch);
    const store = await getStore();

    return store.withRefreshLock(key, async () => {
      let current = expired;
      if (active?.isSaved) {
        // A read failure propagates: without the store's answer, the refresh
        // token in memory may already be spent.
        const saved = await store.load(key);
        if (!saved) {
          logger.info('The saved Transcend sign-in was removed; a new sign-in is needed');
          active = null;
          return null;
        }
        current = saved;
        active = { tokens: saved, key, isSaved: true };
      }

      if (isStoredOAuthTokenValid(current, now())) {
        return storedOAuthTokensToAuth(current);
      }

      if (!current.refreshToken) {
        await signOut(key);
        return null;
      }

      let refreshed: StoredOAuthTokens;
      try {
        refreshed = await refreshOAuthTokens({
          tokenEndpoint: metadata.tokenEndpoint,
          stored: current,
          clientSecret: client.clientSecret,
          fetch: options.fetch,
          nowMs: now(),
        });
      } catch (error) {
        const isRefreshTokenRejected =
          error instanceof OAuthTokenRequestError && error.oauthError === OAUTH_INVALID_GRANT_ERROR;
        if (!isRefreshTokenRejected) throw error;
        logger.warn('The saved Transcend sign-in is no longer valid; a new sign-in is needed');
        await signOut(key);
        return null;
      }

      await save(key, refreshed, logger);
      return storedOAuthTokensToAuth(refreshed);
    });
  };

  return {
    getActiveStoredTokens: () => active?.tokens ?? null,
    getActiveCredentials: () => (active ? storedOAuthTokensToAuth(active.tokens) : null),
    setActiveStoredTokens: (tokens) => {
      active = tokens && { tokens, key: null, isSaved: false };
    },
    saveTokens: (client, tokens, logger) => save(credentialStoreKey(client), tokens, logger),
    getValidCredentials: async (client, logger) => {
      const key = credentialStoreKey(client);
      const tokens = await loadTokens(key, logger);
      if (!tokens) return null;
      if (isStoredOAuthTokenValid(tokens, now())) return storedOAuthTokensToAuth(tokens);

      if (!refreshPromise) {
        refreshPromise = refreshUnderLock(key, client, tokens, logger)
          .catch((error: unknown) => {
            logger.error('OAuth token refresh failed; keeping the saved sign-in', {
              error: describeError(error),
            });
            throw toRefreshToolError(error);
          })
          .finally(() => {
            refreshPromise = null;
          });
      }
      return refreshPromise;
    },
    reset: () => {
      active = null;
      refreshPromise = null;
      storePromise = null;
    },
  };
}

/** The token manager the running server uses, saving to the store the environment selects. */
export const defaultOAuthTokenManager: OAuthTokenManager = createOAuthTokenManager({
  store: () => resolveCredentialStore({ logger: new SimpleLogger() }),
});

/**
 * Resets in-memory OAuth token manager state (for tests).
 */
export function resetOAuthTokenManagerState(): void {
  defaultOAuthTokenManager.reset();
}

/**
 * Returns the OAuth tokens held in this process.
 */
export function getActiveStoredOAuthTokens(): StoredOAuthTokens | null {
  return defaultOAuthTokenManager.getActiveStoredTokens();
}

/**
 * Sets the OAuth tokens held in this process, without saving them.
 */
export function setActiveStoredOAuthTokens(tokens: StoredOAuthTokens | null): void {
  defaultOAuthTokenManager.setActiveStoredTokens(tokens);
}

/**
 * Returns OAuth credentials for the tokens held in this process.
 */
export function getActiveOAuthCredentials(): OAuthTokenAuth | null {
  return defaultOAuthTokenManager.getActiveCredentials();
}

/**
 * Returns valid OAuth credentials for the client in the environment, loading
 * the saved login and refreshing the access token when needed. Returns `null`
 * when no client is configured or the user has to sign in.
 */
export async function getValidOAuthCredentials(
  issuer: string,
  logger: Logger,
): Promise<OAuthTokenAuth | null> {
  const clientId = getOAuthClientIdFromEnv();
  const clientSecret = getOAuthClientSecret();
  if (!clientId || !clientSecret) return null;
  return defaultOAuthTokenManager.getValidCredentials(
    { issuer, clientId, clientSecret, scopes: getOAuthScopes() },
    logger,
  );
}
