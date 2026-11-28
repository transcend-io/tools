import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { McpToolErrorCode } from '@transcend-io/privacy-types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SimpleLogger } from '../src/clients/graphql/base.js';
import type { ToolError } from '../src/errors.js';
import { createFallbackCredentialStore } from '../src/oauth/credential-store/fallback-store.js';
import { createFileCredentialStore } from '../src/oauth/credential-store/file-store.js';
import { createKeyringCredentialStore } from '../src/oauth/credential-store/keyring-store.js';
import { createMemoryCredentialStore } from '../src/oauth/credential-store/memory-store.js';
import { LockLostError } from '../src/oauth/credential-store/refresh-lock.js';
import { credentialStoreKey } from '../src/oauth/credential-store/stored-tokens.js';
import type { CredentialStore, Keyring } from '../src/oauth/credential-store/types.js';
import { configureOAuthScopes, resetConfiguredOAuthScopes } from '../src/oauth/scopes.js';
import {
  createOAuthTokenManager,
  getActiveStoredOAuthTokens,
  getValidOAuthCredentials,
  resetOAuthTokenManagerState,
  setActiveStoredOAuthTokens,
  type OAuthClientCredentials,
  type OAuthTokenManager,
} from '../src/oauth/token-manager.js';
import { storedTokensFromTokenResponse } from '../src/oauth/token-store.js';
import {
  createFakeAuthorizationServer,
  FAKE_ACCESS_TOKEN_LIFETIME_SECONDS,
  type FakeAuthorizationServer,
} from './helpers/fake-authorization-server.js';

const ISSUER = 'https://issuer.example';
const CLIENT: OAuthClientCredentials = {
  issuer: ISSUER,
  clientId: 'client-abc',
  clientSecret: 'secret',
  scopes: ['ViewRequests', 'offline_access'],
};
const KEY = credentialStoreKey(CLIENT);
const SIGN_IN_TIME_MS = 1_700_000_000_000;
const ACCESS_TOKEN_LIFETIME_MS = FAKE_ACCESS_TOKEN_LIFETIME_SECONDS * 1000;

describe('createOAuthTokenManager', () => {
  const logger = new SimpleLogger();
  let directory: string;
  let server: FakeAuthorizationServer;
  let nowMs: number;

  /** A store over the shared directory, as one more process would open it. */
  const openStore = (): CredentialStore => createFileCredentialStore({ directory, logger });

  /** A token manager with nothing in memory, as a newly started process has. */
  const startProcess = (store: CredentialStore = openStore()): OAuthTokenManager =>
    createOAuthTokenManager({ store, now: () => nowMs, fetch: server.fetch });

  /** Signs in from one process and saves the login, then lets the access token expire. */
  const saveExpiredLogin = async (): Promise<void> => {
    await startProcess().saveTokens(CLIENT, server.signIn(nowMs), logger);
    nowMs += ACCESS_TOKEN_LIFETIME_MS;
  };

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'mcp-token-manager-'));
    server = createFakeAuthorizationServer(CLIENT);
    nowMs = SIGN_IN_TIME_MS;
    vi.spyOn(logger, 'info').mockImplementation(() => undefined);
    vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    vi.spyOn(logger, 'error').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(directory, { recursive: true, force: true });
  });

  describe('a saved login', () => {
    it('is used by a new process without any request to the server', async () => {
      await startProcess().saveTokens(CLIENT, server.signIn(nowMs), logger);
      const fetchSpy = vi.spyOn(server, 'fetch');

      const credentials = await startProcess().getValidCredentials(CLIENT, logger);

      expect(credentials).toMatchObject({ type: 'oauthToken', accessToken: 'access-1' });
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('is refreshed by a new process once the access token expires, and saved again', async () => {
      await saveExpiredLogin();

      const credentials = await startProcess().getValidCredentials(CLIENT, logger);

      expect(credentials).toMatchObject({ accessToken: 'access-2', refreshToken: 'refresh-2' });
      expect(await openStore().load(KEY)).toMatchObject({
        accessToken: 'access-2',
        refreshToken: 'refresh-2',
        expiresAt: nowMs + ACCESS_TOKEN_LIFETIME_MS - 60_000,
      });

      const next = await startProcess().getValidCredentials(CLIENT, logger);
      expect(next?.accessToken).toBe('access-2');
      expect(server.refreshRequestCount()).toBe(1);
    });

    it('is not loaded for a server that asks for other scopes', async () => {
      await startProcess().saveTokens(CLIENT, server.signIn(nowMs), logger);

      const otherScopes = await startProcess().getValidCredentials(
        { ...CLIENT, scopes: [...CLIENT.scopes, 'ManageRequestCompilation'] },
        logger,
      );

      expect(otherScopes).toBeNull();
      expect(await openStore().load(KEY)).not.toBeNull();
    });

    it('is not loaded for another issuer or another client', async () => {
      await startProcess().saveTokens(CLIENT, server.signIn(nowMs), logger);

      const otherIssuer = await startProcess().getValidCredentials(
        { ...CLIENT, issuer: 'https://other.example' },
        logger,
      );
      const otherClient = await startProcess().getValidCredentials(
        { ...CLIENT, clientId: 'client-xyz' },
        logger,
      );

      expect(otherIssuer).toBeNull();
      expect(otherClient).toBeNull();
      expect(await openStore().load(KEY)).not.toBeNull();
    });

    it('means "no login" when the saved file is corrupt', async () => {
      await startProcess().saveTokens(CLIENT, server.signIn(nowMs), logger);
      await writeFile(join(directory, 'credentials.json'), '{"half a file', { mode: 0o600 });

      await expect(startProcess().getValidCredentials(CLIENT, logger)).resolves.toBeNull();
    });

    it('means "no login" when the saved entry has the wrong shape', async () => {
      await startProcess().saveTokens(CLIENT, server.signIn(nowMs), logger);
      await writeFile(
        join(directory, 'credentials.json'),
        JSON.stringify({ [KEY]: { accessToken: 'access-1', expiresAt: 'tomorrow' } }),
        { mode: 0o600 },
      );

      await expect(startProcess().getValidCredentials(CLIENT, logger)).resolves.toBeNull();
    });

    it('means "no login" when it is expired and has no refresh token', async () => {
      const { refreshToken: _refreshToken, ...tokens } = server.signIn(nowMs);
      await startProcess().saveTokens(CLIENT, tokens, logger);
      nowMs += ACCESS_TOKEN_LIFETIME_MS;

      await expect(startProcess().getValidCredentials(CLIENT, logger)).resolves.toBeNull();
      expect(server.refreshRequestCount()).toBe(0);
      expect(await openStore().load(KEY)).toBeNull();
    });

    it('fails with a retryable error when the store cannot be read at startup', async () => {
      const store: CredentialStore = {
        ...createMemoryCredentialStore(),
        load: async () => {
          throw new Error('keychain is locked');
        },
      };

      await expect(startProcess(store).getValidCredentials(CLIENT, logger)).rejects.toMatchObject({
        code: McpToolErrorCode.ApiError,
        retryable: true,
      } satisfies Partial<ToolError>);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Could not read the saved Transcend sign-in'),
        { error: 'keychain is locked' },
      );
    });
  });

  describe('a store that cannot be opened', () => {
    it('fails the call with the reason instead of asking for a sign-in', async () => {
      const manager = createOAuthTokenManager({
        store: async () => {
          throw new Error(
            'TRANSCEND_MCP_CREDENTIAL_STORE=keyring but the OS keychain is not available',
          );
        },
        fetch: server.fetch,
      });

      await expect(manager.getValidCredentials(CLIENT, logger)).rejects.toThrow(
        'TRANSCEND_MCP_CREDENTIAL_STORE=keyring but the OS keychain is not available',
      );
    });
  });

  describe('a failed refresh', () => {
    it.each([
      {
        failure: 'the request never gets an answer',
        respond: (): Response => {
          throw new TypeError('fetch failed');
        },
      },
      { failure: 'the server answers 503', respond: () => new Response('', { status: 503 }) },
      { failure: 'the server answers 429', respond: () => new Response('', { status: 429 }) },
    ])('keeps the login and can be retried when $failure', async ({ respond }) => {
      await saveExpiredLogin();
      const manager = startProcess();
      server.failNextRefresh(respond);

      await expect(manager.getValidCredentials(CLIENT, logger)).rejects.toMatchObject({
        name: 'ToolError',
        code: McpToolErrorCode.ApiError,
        retryable: true,
      } satisfies Partial<ToolError>);
      expect(await openStore().load(KEY)).toMatchObject({ refreshToken: 'refresh-1' });

      const retried = await manager.getValidCredentials(CLIENT, logger);
      expect(retried?.accessToken).toBe('access-2');
      expect(server.isGrantRevoked()).toBe(false);
    });

    it('clears the login when the server rejects the refresh token', async () => {
      await saveExpiredLogin();
      const manager = startProcess();
      server.revokeGrant();

      await expect(manager.getValidCredentials(CLIENT, logger)).resolves.toBeNull();

      expect(manager.getActiveStoredTokens()).toBeNull();
      expect(await openStore().load(KEY)).toBeNull();
    });

    it('keeps the login and cannot be retried when the server rejects the client', async () => {
      await saveExpiredLogin();
      const manager = startProcess();

      await expect(
        manager.getValidCredentials({ ...CLIENT, clientSecret: 'wrong-secret' }, logger),
      ).rejects.toMatchObject({
        name: 'ToolError',
        code: McpToolErrorCode.AuthError,
        retryable: false,
      } satisfies Partial<ToolError>);
      expect(await openStore().load(KEY)).toMatchObject({ refreshToken: 'refresh-1' });
    });
  });

  describe('several users of one login', () => {
    it('sends one refresh request for parallel calls in one process', async () => {
      await saveExpiredLogin();
      const manager = startProcess();

      const results = await Promise.all([
        manager.getValidCredentials(CLIENT, logger),
        manager.getValidCredentials(CLIENT, logger),
        manager.getValidCredentials(CLIENT, logger),
      ]);

      expect(results.map((credentials) => credentials?.accessToken)).toEqual([
        'access-2',
        'access-2',
        'access-2',
      ]);
      expect(server.refreshRequestCount()).toBe(1);
    });

    it('sends one refresh request when two processes refresh at the same time', async () => {
      server = createFakeAuthorizationServer({ ...CLIENT, refreshDelayMs: 50 });
      await saveExpiredLogin();
      const first = startProcess();
      const second = startProcess();

      const [firstCredentials, secondCredentials] = await Promise.all([
        first.getValidCredentials(CLIENT, logger),
        second.getValidCredentials(CLIENT, logger),
      ]);

      expect(firstCredentials).toMatchObject({
        accessToken: 'access-2',
        refreshToken: 'refresh-2',
      });
      expect(secondCredentials).toMatchObject({
        accessToken: 'access-2',
        refreshToken: 'refresh-2',
      });
      expect(server.refreshRequestCount()).toBe(1);
      expect(server.isGrantRevoked()).toBe(false);
    });

    it('adopts a token another process rotated instead of spending the old one', async () => {
      await startProcess().saveTokens(CLIENT, server.signIn(nowMs), logger);
      const idle = startProcess();
      await idle.getValidCredentials(CLIENT, logger);
      nowMs += ACCESS_TOKEN_LIFETIME_MS;
      await startProcess().getValidCredentials(CLIENT, logger);
      expect(idle.getActiveStoredTokens()?.refreshToken).toBe('refresh-1');

      const credentials = await idle.getValidCredentials(CLIENT, logger);

      expect(credentials).toMatchObject({ accessToken: 'access-2', refreshToken: 'refresh-2' });
      expect(server.refreshRequestCount()).toBe(1);
      expect(server.isGrantRevoked()).toBe(false);
    });

    it('asks for a new sign-in when another process signed out', async () => {
      await startProcess().saveTokens(CLIENT, server.signIn(nowMs), logger);
      const manager = startProcess();
      await manager.getValidCredentials(CLIENT, logger);
      await openStore().clear(KEY);
      nowMs += ACCESS_TOKEN_LIFETIME_MS;

      await expect(manager.getValidCredentials(CLIENT, logger)).resolves.toBeNull();
      expect(server.refreshRequestCount()).toBe(0);
    });

    it('does not refresh when it cannot check the store for a newer token', async () => {
      const store = createMemoryCredentialStore();
      const manager = startProcess(store);
      await manager.saveTokens(CLIENT, server.signIn(nowMs), logger);
      nowMs += ACCESS_TOKEN_LIFETIME_MS;
      vi.spyOn(store, 'load').mockRejectedValueOnce(new Error('keychain is locked'));

      await expect(manager.getValidCredentials(CLIENT, logger)).rejects.toMatchObject({
        code: McpToolErrorCode.ApiError,
        retryable: true,
      } satisfies Partial<ToolError>);
      expect(server.refreshRequestCount()).toBe(0);

      const retried = await manager.getValidCredentials(CLIENT, logger);
      expect(retried?.accessToken).toBe('access-2');
    });
  });

  describe('a lost refresh lock', () => {
    /** Makes the store report that the lock is lost from the `lostAtCall`-th check on. */
    const loseLockFromCheck = (store: CredentialStore, lostAtCall: number): void => {
      const withLock = store.withRefreshLock.bind(store);
      vi.spyOn(store, 'withRefreshLock').mockImplementation((key, task) => {
        let checks = 0;
        return withLock(key, (assertHeld) =>
          task(async () => {
            checks += 1;
            if (checks >= lostAtCall) throw new LockLostError('lock');
            await assertHeld();
          }),
        );
      });
    };

    it('does not spend the refresh token when the lock is lost before the request', async () => {
      const store = createMemoryCredentialStore();
      const manager = startProcess(store);
      await manager.saveTokens(CLIENT, server.signIn(nowMs), logger);
      nowMs += ACCESS_TOKEN_LIFETIME_MS;
      loseLockFromCheck(store, 1);

      await expect(manager.getValidCredentials(CLIENT, logger)).rejects.toMatchObject({
        code: McpToolErrorCode.ApiError,
        retryable: true,
      } satisfies Partial<ToolError>);

      expect(server.refreshRequestCount()).toBe(0);
      expect(await store.load(KEY)).toMatchObject({ refreshToken: 'refresh-1' });
    });

    it('saves the rotated token when the lock is lost but the store holds the spent one', async () => {
      const store = createMemoryCredentialStore();
      const manager = startProcess(store);
      await manager.saveTokens(CLIENT, server.signIn(nowMs), logger);
      nowMs += ACCESS_TOKEN_LIFETIME_MS;
      loseLockFromCheck(store, 2);

      const credentials = await manager.getValidCredentials(CLIENT, logger);

      expect(credentials).toMatchObject({ accessToken: 'access-2', refreshToken: 'refresh-2' });
      // Another process that read the store would otherwise spend the spent token.
      expect(await store.load(KEY)).toMatchObject({ refreshToken: 'refresh-2' });
      expect(server.isGrantRevoked()).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('refresh lock was lost'),
        expect.anything(),
      );

      const secondProcess = await startProcess(store).getValidCredentials(CLIENT, logger);
      expect(secondProcess?.refreshToken).toBe('refresh-2');
      expect(server.refreshRequestCount()).toBe(1);
    });

    it('keeps the rotated token in memory when the lock is lost and a newer login is saved', async () => {
      const store = createMemoryCredentialStore();
      const manager = startProcess(store);
      await manager.saveTokens(CLIENT, server.signIn(nowMs), logger);
      nowMs += ACCESS_TOKEN_LIFETIME_MS;
      const withLock = store.withRefreshLock.bind(store);
      vi.spyOn(store, 'withRefreshLock').mockImplementation((key, task) =>
        withLock(key, (assertHeld) => {
          let checks = 0;
          return task(async () => {
            checks += 1;
            if (checks < 2) return assertHeld();
            // The new holder of the lock refreshed and saved first.
            const saved = await store.load(key);
            await store.save(key, { ...saved!, refreshToken: 'refresh-from-new-holder' });
            throw new LockLostError('lock');
          });
        }),
      );

      const credentials = await manager.getValidCredentials(CLIENT, logger);

      expect(credentials).toMatchObject({ refreshToken: 'refresh-2' });
      expect(await store.load(KEY)).toMatchObject({ refreshToken: 'refresh-from-new-holder' });
    });
  });

  describe('a rejected refresh token in a login that is only in memory', () => {
    it('adopts the newer saved login instead of clearing it', async () => {
      const store = createMemoryCredentialStore();
      const manager = startProcess(store);
      vi.spyOn(store, 'save').mockRejectedValueOnce(new Error('keychain denied the write'));
      const signedIn = server.signIn(nowMs);
      await manager.saveTokens(CLIENT, signedIn, logger);
      nowMs += ACCESS_TOKEN_LIFETIME_MS;
      // Another process signed in again and saved a login of its own.
      await store.save(KEY, { ...signedIn, refreshToken: 'refresh-newer', expiresAt: nowMs + 1e6 });
      server.revokeGrant();

      await expect(manager.getValidCredentials(CLIENT, logger)).rejects.toMatchObject({
        code: McpToolErrorCode.ApiError,
        retryable: true,
      } satisfies Partial<ToolError>);

      expect(await store.load(KEY)).toMatchObject({ refreshToken: 'refresh-newer' });
      expect(manager.getActiveStoredTokens()).toMatchObject({ refreshToken: 'refresh-newer' });
    });
  });

  describe('a keychain that rejects saves', () => {
    /** An in-memory keychain. */
    function createFakeKeyring(): Keyring & { secrets: Map<string, string> } {
      const secrets = new Map<string, string>();
      return {
        secrets,
        get: async (_service, account) => secrets.get(account) ?? null,
        set: async (_service, account, secret) => {
          secrets.set(account, secret);
        },
        delete: async (_service, account) => {
          secrets.delete(account);
        },
        accounts: async () => [...secrets.keys()],
      };
    }

    it('rotates through the file without revoking the grant across two processes', async () => {
      const keyring = createFakeKeyring();
      const fileStore = createFileCredentialStore({ directory, logger });
      const keyringStore = createKeyringCredentialStore({
        keyring,
        lockDirectory: directory,
        logger,
      });
      await keyringStore.save(KEY, server.signIn(nowMs));
      const store = createFallbackCredentialStore({
        primary: keyringStore,
        fallback: fileStore,
        logger,
      });
      const first = createOAuthTokenManager({ store, now: () => nowMs, fetch: server.fetch });
      const second = createOAuthTokenManager({ store, now: () => nowMs, fetch: server.fetch });
      nowMs += ACCESS_TOKEN_LIFETIME_MS;
      keyring.set = async () => {
        throw new Error('keychain is locked');
      };

      const firstCredentials = await first.getValidCredentials(CLIENT, logger);
      const secondCredentials = await second.getValidCredentials(CLIENT, logger);

      expect(firstCredentials).toMatchObject({
        accessToken: 'access-2',
        refreshToken: 'refresh-2',
      });
      expect(secondCredentials).toMatchObject({
        accessToken: 'access-2',
        refreshToken: 'refresh-2',
      });
      expect(server.refreshRequestCount()).toBe(1);
      expect(server.isGrantRevoked()).toBe(false);
      expect((await fileStore.load(KEY))?.refreshToken).toBe('refresh-2');
    });
  });

  describe('a store that cannot be written', () => {
    it('keeps the rotated token in memory and removes the spent one from the store', async () => {
      const store = createMemoryCredentialStore();
      const manager = startProcess(store);
      await manager.saveTokens(CLIENT, server.signIn(nowMs), logger);
      nowMs += ACCESS_TOKEN_LIFETIME_MS;
      vi.spyOn(store, 'save').mockRejectedValue(new Error('keychain denied the write'));

      const credentials = await manager.getValidCredentials(CLIENT, logger);

      expect(credentials?.accessToken).toBe('access-2');
      expect(await store.load(KEY)).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('TRANSCEND_MCP_CREDENTIAL_STORE=file'),
        { error: 'keychain denied the write' },
      );

      nowMs += ACCESS_TOKEN_LIFETIME_MS;
      const next = await manager.getValidCredentials(CLIENT, logger);
      expect(next?.accessToken).toBe('access-3');
      expect(server.isGrantRevoked()).toBe(false);
    });
  });
});

describe('getValidOAuthCredentials', () => {
  const logger = new SimpleLogger();
  const issuer = 'https://yo.com:4001';

  beforeEach(() => {
    resetOAuthTokenManagerState();
    configureOAuthScopes(['ViewRequests']);
    vi.stubEnv('TRANSCEND_OAUTH_CLIENT_ID', 'client-abc');
    vi.stubEnv('TRANSCEND_OAUTH_CLIENT_SECRET', 'secret');
  });

  afterEach(() => {
    resetOAuthTokenManagerState();
    resetConfiguredOAuthScopes();
    vi.unstubAllEnvs();
  });

  it('returns the credentials held in this process for the configured client', async () => {
    setActiveStoredOAuthTokens(
      storedTokensFromTokenResponse({
        response: { access_token: 'valid-access', expires_in: 3600 },
        issuer,
        clientId: 'client-abc',
      }),
    );

    const credentials = await getValidOAuthCredentials(issuer, logger);

    expect(credentials).toMatchObject({ type: 'oauthToken', accessToken: 'valid-access' });
    expect(getActiveStoredOAuthTokens()?.accessToken).toBe('valid-access');
  });

  it('returns null when no OAuth client is configured', async () => {
    vi.stubEnv('TRANSCEND_OAUTH_CLIENT_ID', '');

    await expect(getValidOAuthCredentials(issuer, logger)).resolves.toBeNull();
  });
});
