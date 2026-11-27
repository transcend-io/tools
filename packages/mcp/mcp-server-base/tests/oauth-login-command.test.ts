import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SimpleLogger } from '../src/clients/graphql/base.js';
import { createFileCredentialStore } from '../src/oauth/credential-store/file-store.js';
import { credentialStoreKey } from '../src/oauth/credential-store/stored-tokens.js';
import type { CredentialStore } from '../src/oauth/credential-store/types.js';
import {
  runOAuthLoginCommand,
  type RunOAuthLoginCommandOptions,
} from '../src/oauth/login-command.js';
import {
  createOAuthTokenManager,
  type OAuthClientCredentials,
} from '../src/oauth/token-manager.js';
import {
  createFakeAuthorizationServer,
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
const NOW_MS = 1_700_000_000_000;

describe('runOAuthLoginCommand', () => {
  const logger = new SimpleLogger();
  let directory: string;
  let store: CredentialStore;
  let server: FakeAuthorizationServer;
  let output: string[];

  const run = (
    argv: string[],
    overrides: Partial<RunOAuthLoginCommandOptions> = {},
  ): Promise<number | undefined> =>
    runOAuthLoginCommand({
      argv,
      stores: [store],
      clientId: CLIENT.clientId,
      clientSecret: CLIENT.clientSecret,
      issuers: [ISSUER],
      fetch: server.fetch,
      now: () => NOW_MS,
      write: (line) => output.push(line),
      ...overrides,
    });

  /** What the next tool call would find: credentials, or `null` when it has to sign in. */
  const credentialsForNextToolCall = (): ReturnType<
    ReturnType<typeof createOAuthTokenManager>['getValidCredentials']
  > =>
    createOAuthTokenManager({ store, now: () => NOW_MS, fetch: server.fetch }).getValidCredentials(
      CLIENT,
      logger,
    );

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'mcp-login-command-'));
    store = createFileCredentialStore({ directory, logger });
    server = createFakeAuthorizationServer(CLIENT);
    output = [];
    vi.spyOn(logger, 'info').mockImplementation(() => undefined);
    vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(directory, { recursive: true, force: true });
  });

  it.each([[[]], [['--transport', 'http']], [['--status']]])(
    'leaves arguments %j to the server',
    async (argv) => {
      await expect(run(argv)).resolves.toBeUndefined();
      expect(output).toEqual([]);
    },
  );

  describe('logout', () => {
    it('revokes the grant, removes the saved login, and the next tool call has to sign in', async () => {
      await store.save(KEY, server.signIn(NOW_MS));
      await expect(credentialsForNextToolCall()).resolves.not.toBeNull();

      const exitCode = await run(['logout']);

      expect(exitCode).toBe(0);
      expect(server.revokedTokens()).toEqual(['refresh-1']);
      expect(server.isGrantRevoked()).toBe(true);
      expect(await store.load(KEY)).toBeNull();
      await expect(credentialsForNextToolCall()).resolves.toBeNull();
      expect(output).toEqual([`Signed out of ${ISSUER}.`]);
    });

    it.each([
      {
        failure: 'the server answers 503',
        respond: () => new Response('', { status: 503 }),
        detail: 'HTTP 503',
      },
      {
        failure: 'the request never gets an answer',
        respond: (): Response => {
          throw new TypeError('fetch failed');
        },
        detail: 'fetch failed',
      },
    ])(
      'still removes the saved login and reports it when $failure',
      async ({ respond, detail }) => {
        await store.save(KEY, server.signIn(NOW_MS));
        server.failNextRevocation(respond);

        const exitCode = await run(['logout']);

        expect(exitCode).toBe(1);
        expect(await store.load(KEY)).toBeNull();
        await expect(credentialsForNextToolCall()).resolves.toBeNull();
        expect(output.join('\n')).toContain('could not revoke it at Transcend');
        expect(output.join('\n')).toContain(detail);
      },
    );

    it('revokes the token another process rotated after the logins were listed', async () => {
      const signedIn = server.signIn(NOW_MS);
      await store.save(KEY, signedIn);
      const withLock = store.withRefreshLock.bind(store);
      vi.spyOn(store, 'withRefreshLock').mockImplementation(async (key, task) => {
        // A running server refreshes between the listing and the lock.
        await store.save(key, { ...signedIn, refreshToken: 'refresh-rotated' });
        return withLock(key, task);
      });

      const exitCode = await run(['logout']);

      expect(exitCode).toBe(0);
      expect(server.revokedTokens()).toEqual(['refresh-rotated']);
      expect(await store.load(KEY)).toBeNull();
    });

    it('fails and says so when the keychain was skipped', async () => {
      await store.save(KEY, server.signIn(NOW_MS));

      const exitCode = await run(['logout'], { keychainUnavailable: 'no keychain' });

      expect(exitCode).toBe(1);
      expect(output.join('\n')).toContain('OS keychain skipped: no keychain');
    });

    it('never sends a token to an issuer the server does not sign in with', async () => {
      await store.save(KEY, server.signIn(NOW_MS));
      const fetchSpy = vi.spyOn(server, 'fetch');

      const exitCode = await run(['logout'], {
        issuers: ['https://trusted.example'],
        fetch: server.fetch,
      });

      expect(exitCode).toBe(1);
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(await store.load(KEY)).toBeNull();
    });

    it('signs out of every scope set this client has a login for', async () => {
      const otherScopesKey = credentialStoreKey({ ...CLIENT, scopes: ['ViewDataMap'] });
      await store.save(otherScopesKey, server.signIn(NOW_MS));
      await store.save(KEY, server.signIn(NOW_MS));

      const exitCode = await run(['logout']);

      expect(exitCode).toBe(0);
      expect(server.revokedTokens().sort()).toEqual(['refresh-1', 'refresh-2']);
      expect(await store.keys()).toEqual([]);
    });

    it('leaves the logins of other clients alone', async () => {
      const otherKey = credentialStoreKey({ ...CLIENT, clientId: 'client-xyz' });
      await store.save(KEY, server.signIn(NOW_MS));
      await store.save(otherKey, { ...server.signIn(NOW_MS), clientId: 'client-xyz' });

      await run(['logout']);

      expect(await store.keys()).toEqual([otherKey]);
    });

    it('explains what is missing when the client secret is not set', async () => {
      await store.save(KEY, server.signIn(NOW_MS));

      const exitCode = await run(['logout'], { clientSecret: '' });

      expect(exitCode).toBe(1);
      expect(output.join('\n')).toContain('TRANSCEND_OAUTH_CLIENT_SECRET');
      expect(output.join('\n')).toContain('logout --all');
      expect(await store.load(KEY)).not.toBeNull();
    });

    it('says so when there is nothing to sign out of', async () => {
      await expect(run(['logout'])).resolves.toBe(0);
      expect(output).toEqual(['Not signed in.']);
    });
  });

  describe('logout --all', () => {
    it('removes every saved login without a client secret or a request', async () => {
      const fetchSpy = vi.spyOn(server, 'fetch');
      await store.save(KEY, server.signIn(NOW_MS));
      await store.save(credentialStoreKey({ ...CLIENT, clientId: 'client-xyz' }), {
        ...server.signIn(NOW_MS),
        clientId: 'client-xyz',
      });

      const exitCode = await run(['logout', '--all'], {
        clientId: '',
        clientSecret: '',
        fetch: server.fetch,
      });

      expect(exitCode).toBe(0);
      expect(await store.keys()).toEqual([]);
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(output.join('\n')).toContain('Removed 2 saved login(s)');
      expect(output.join('\n')).toContain('not revoked');
    });
  });

  describe('with logins in more than one store', () => {
    let otherDirectory: string;
    let otherStore: CredentialStore;

    beforeEach(async () => {
      otherDirectory = await mkdtemp(join(tmpdir(), 'mcp-login-command-other-'));
      otherStore = createFileCredentialStore({ directory: otherDirectory, logger });
    });

    afterEach(async () => {
      await rm(otherDirectory, { recursive: true, force: true });
    });

    it('status lists every store', async () => {
      await store.save(KEY, server.signIn(NOW_MS));
      await otherStore.save(KEY, server.signIn(NOW_MS));

      await run(['status'], { stores: [store, otherStore] });

      expect(output.filter((line) => line.startsWith('Credential store:'))).toEqual([
        `Credential store: file (${store.location})`,
        `Credential store: file (${otherStore.location})`,
      ]);
      expect(output.filter((line) => line === 'Signed in:')).toHaveLength(2);
    });

    it('logout revokes and removes the login in every store', async () => {
      await store.save(KEY, server.signIn(NOW_MS));
      await otherStore.save(KEY, server.signIn(NOW_MS));

      const exitCode = await run(['logout'], { stores: [store, otherStore] });

      expect(exitCode).toBe(0);
      expect(await store.keys()).toEqual([]);
      expect(await otherStore.keys()).toEqual([]);
      expect(server.revokedTokens()).toHaveLength(2);
    });

    it('logout --all removes the logins in every store, each under its lock', async () => {
      await store.save(KEY, server.signIn(NOW_MS));
      await otherStore.save(KEY, server.signIn(NOW_MS));
      const lockSpy = vi.spyOn(otherStore, 'withRefreshLock');

      const exitCode = await run(['logout', '--all'], { stores: [store, otherStore] });

      expect(exitCode).toBe(0);
      expect(lockSpy).toHaveBeenCalledWith(KEY, expect.any(Function));
      expect(await store.keys()).toEqual([]);
      expect(await otherStore.keys()).toEqual([]);
      expect(output.join('\n')).toContain('Removed 2 saved login(s)');
    });
  });

  describe('status', () => {
    it('says when the keychain was skipped', async () => {
      await run(['status'], { keychainUnavailable: 'no keychain' });

      expect(output[0]).toContain('OS keychain skipped: no keychain');
    });

    it('prints the store, issuer, client ID, and expiry, and never a token', async () => {
      const tokens = server.signIn(NOW_MS);
      await store.save(KEY, tokens);

      const exitCode = await run(['status']);

      expect(exitCode).toBe(0);
      expect(output).toEqual([
        `Credential store: file (${join(directory, 'credentials.json')})`,
        'Signed in:',
        `  Issuer: ${ISSUER}`,
        '  Client ID: client-abc',
        `  Access token: expires ${new Date(tokens.expiresAt).toISOString()} (renews on the next tool call)`,
      ]);
      expect(output.join('\n')).not.toContain(tokens.accessToken);
      expect(output.join('\n')).not.toContain(tokens.refreshToken);
      expect(output.join('\n')).not.toContain(CLIENT.clientSecret);
    });

    it('says when the access token has expired', async () => {
      await store.save(KEY, { ...server.signIn(NOW_MS), expiresAt: NOW_MS - 1 });

      await run(['status']);

      expect(output.join('\n')).toContain('Access token: expired');
    });

    it('says so when there is no saved login', async () => {
      await expect(run(['status'])).resolves.toBe(0);
      expect(output).toEqual([
        `Credential store: file (${join(directory, 'credentials.json')})`,
        'Not signed in.',
      ]);
    });
  });
});
