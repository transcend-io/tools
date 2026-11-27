import { SimpleLogger } from '../clients/graphql/base.js';
import {
  getOAuthClientIdFromEnv,
  getOAuthClientSecret,
  getOAuthIssuerCandidates,
} from './config.js';
import {
  OAuthTokenTypeHint,
  TRANSCEND_OAUTH_CLIENT_ID_ENV,
  TRANSCEND_OAUTH_CLIENT_SECRET_ENV,
} from './constants.js';
import { resolveCredentialStore } from './credential-store/resolve-credential-store.js';
import type { CredentialStore } from './credential-store/types.js';
import { fetchAuthorizationServerMetadata } from './metadata.js';
import { normalizeIssuer } from './normalize-issuer.js';
import { revokeOAuthToken } from './token-revocation.js';
import type { StoredOAuthTokens } from './types.js';

/** Subcommands that manage the saved login instead of starting the server. */
enum OAuthLoginCommand {
  /** Prints where the login is saved and when its access token expires */
  Status = 'status',
  /** Revokes the login and removes the saved entry */
  Logout = 'logout',
}

/** Flag for `logout` that removes every saved login without revoking any. */
const LOGOUT_ALL_FLAG = '--all';

export interface RunOAuthLoginCommandOptions {
  /** Command-line arguments after the executable; defaults to `process.argv.slice(2)` */
  argv?: readonly string[];
  /** Where saved logins live; defaults to the store the environment selects */
  store?: CredentialStore;
  /** OAuth client identifier; defaults to `TRANSCEND_OAUTH_CLIENT_ID` */
  clientId?: string;
  /** OAuth client secret; defaults to `TRANSCEND_OAUTH_CLIENT_SECRET` */
  clientSecret?: string;
  /** Issuers a token may be revoked at; defaults to the issuers the server signs in with */
  issuers?: readonly string[];
  /** Fetch implementation; defaults to the global `fetch` */
  fetch?: typeof fetch;
  /** Clock; defaults to `Date.now` */
  now?: () => number;
  /** Prints one line of output; defaults to stdout */
  write?: (line: string) => void;
}

/** What the commands need, with every default applied. */
interface LoginCommandContext {
  /** Where saved logins live */
  store: CredentialStore;
  /** OAuth client identifier, when configured */
  clientId: string | undefined;
  /** OAuth client secret, when configured */
  clientSecret: string | undefined;
  /** Normalized issuers a token may be revoked at */
  issuers: readonly string[];
  /** Fetch implementation, or `undefined` for the global `fetch` */
  fetch: typeof fetch | undefined;
  /** Clock */
  now: () => number;
  /** Prints one line of output */
  write: (line: string) => void;
}

/** A saved login and the key it is stored under. */
interface SavedLogin {
  /** Store key of the entry */
  key: string;
  /** Tokens saved under the key */
  tokens: StoredOAuthTokens;
}

async function loadSavedLogins(
  store: CredentialStore,
  clientId: string | undefined,
): Promise<SavedLogin[]> {
  const logins: SavedLogin[] = [];
  for (const key of await store.keys()) {
    const tokens = await store.load(key);
    if (tokens && (clientId === undefined || tokens.clientId === clientId)) {
      logins.push({ key, tokens });
    }
  }
  return logins;
}

/** Prints the saved logins. Never prints a token. */
async function runStatus(context: LoginCommandContext): Promise<number> {
  const { store, clientId, now, write } = context;
  write(`Credential store: ${store.kind} (${store.location})`);

  const logins = await loadSavedLogins(store, clientId);
  if (logins.length === 0) {
    write('Not signed in.');
    return 0;
  }

  for (const { tokens } of logins) {
    const expiry = new Date(tokens.expiresAt).toISOString();
    const isExpired = tokens.expiresAt <= now();
    const renewal = tokens.refreshToken
      ? 'renews on the next tool call'
      : 'no refresh token, sign-in needed after expiry';
    write('Signed in:');
    write(`  Issuer: ${tokens.issuer}`);
    write(`  Client ID: ${tokens.clientId}`);
    write(`  Access token: ${isExpired ? 'expired' : 'expires'} ${expiry} (${renewal})`);
  }
  return 0;
}

async function revokeLogin(
  tokens: StoredOAuthTokens,
  clientSecret: string,
  context: LoginCommandContext,
): Promise<void> {
  if (!context.issuers.includes(normalizeIssuer(tokens.issuer))) {
    throw new Error(`${tokens.issuer} is not an issuer this server signs in with`);
  }
  const metadata = await fetchAuthorizationServerMetadata(tokens.issuer, context.fetch);
  if (!metadata.revocationEndpoint) {
    throw new Error(`${tokens.issuer} does not advertise a revocation endpoint`);
  }
  await revokeOAuthToken({
    revocationEndpoint: metadata.revocationEndpoint,
    token: tokens.refreshToken ?? tokens.accessToken,
    tokenTypeHint: tokens.refreshToken
      ? OAuthTokenTypeHint.RefreshToken
      : OAuthTokenTypeHint.AccessToken,
    clientId: tokens.clientId,
    clientSecret,
    fetch: context.fetch,
  });
}

/** Removes every saved login. Nothing is revoked, so no client secret is needed. */
async function runLogoutAll(context: LoginCommandContext): Promise<number> {
  const { store, write } = context;
  const keys = await store.keys();
  if (keys.length === 0) {
    write('Not signed in.');
    return 0;
  }
  for (const key of keys) {
    await store.clear(key);
  }
  write(
    `Removed ${keys.length} saved login(s) from ${store.location}. ` +
      'They were not revoked at Transcend and stay valid until they expire.',
  );
  return 0;
}

/**
 * Revokes this client's login at Transcend and removes the saved entry.
 *
 * The entry is removed even when the revocation fails, so the next tool call
 * always asks for a new sign-in. The failure is reported through the exit code.
 */
async function runLogout(context: LoginCommandContext): Promise<number> {
  const { store, clientId, clientSecret, write } = context;
  if (!clientId || !clientSecret) {
    write(
      `logout needs ${TRANSCEND_OAUTH_CLIENT_ID_ENV} and ${TRANSCEND_OAUTH_CLIENT_SECRET_ENV} ` +
        `to revoke the login. To only remove saved logins, run: logout ${LOGOUT_ALL_FLAG}`,
    );
    return 1;
  }

  const logins = await loadSavedLogins(store, clientId);
  if (logins.length === 0) {
    write('Not signed in.');
    return 0;
  }

  let exitCode = 0;
  for (const { key, tokens } of logins) {
    // Under the refresh lock, and after a re-read, so a running server cannot
    // rotate the token between the revocation and the removal.
    const revocationError = await store.withRefreshLock(key, async () => {
      const current = (await store.load(key)) ?? tokens;
      const error = await revokeLogin(current, clientSecret, context).then(
        () => null,
        (cause: unknown) => (cause instanceof Error ? cause.message : String(cause)),
      );
      await store.clear(key);
      return error;
    });

    if (revocationError === null) {
      write(`Signed out of ${tokens.issuer}.`);
      continue;
    }
    exitCode = 1;
    write(
      `Removed the saved login for ${tokens.issuer}, but could not revoke it at Transcend: ` +
        `${revocationError}. It stays valid until it expires.`,
    );
  }
  return exitCode;
}

/**
 * Runs `status`, `logout`, or `logout --all` when the first argument names one.
 *
 * @returns The process exit code, or `undefined` when the arguments name no
 * login command and the server should start as usual.
 */
export async function runOAuthLoginCommand(
  options: RunOAuthLoginCommandOptions = {},
): Promise<number | undefined> {
  const [command, ...flags] = options.argv ?? process.argv.slice(2);
  if (command !== OAuthLoginCommand.Status && command !== OAuthLoginCommand.Logout) {
    return undefined;
  }

  const context: LoginCommandContext = {
    store: options.store ?? (await resolveCredentialStore({ logger: new SimpleLogger() })),
    clientId: options.clientId ?? getOAuthClientIdFromEnv(),
    clientSecret: options.clientSecret ?? getOAuthClientSecret(),
    issuers: (options.issuers ?? getOAuthIssuerCandidates()).map(normalizeIssuer),
    fetch: options.fetch,
    now: options.now ?? (() => Date.now()),
    write: options.write ?? ((line) => process.stdout.write(`${line}\n`)),
  };

  if (command === OAuthLoginCommand.Status) return runStatus(context);
  if (flags.includes(LOGOUT_ALL_FLAG)) return runLogoutAll(context);
  return runLogout(context);
}
