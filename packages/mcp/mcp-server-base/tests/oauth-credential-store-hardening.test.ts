import { spawn, spawnSync } from 'node:child_process';
import {
  chmod,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { hostname, tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SimpleLogger } from '../src/clients/graphql/base.js';
import {
  ensurePrivateDirectory,
  resolveMcpConfigDirectory,
} from '../src/oauth/credential-store/config-directory.js';
import { createFileCredentialStore } from '../src/oauth/credential-store/file-store.js';
import {
  createKeyringCredentialStore,
  KEYRING_SERVICE,
  loadOsKeyring,
} from '../src/oauth/credential-store/keyring-store.js';
import {
  LockLostError,
  LockTimeoutError,
  withLockFile,
} from '../src/oauth/credential-store/refresh-lock.js';
import { resolveCredentialStores } from '../src/oauth/credential-store/resolve-credential-store.js';
import {
  credentialStoreKey,
  isCredentialStoreKeyFor,
  parseStoredOAuthTokens,
  toStoredOAuthTokensEntry,
} from '../src/oauth/credential-store/stored-tokens.js';
import { CredentialStoreKind, type Keyring } from '../src/oauth/credential-store/types.js';
import type { StoredOAuthTokens } from '../src/oauth/types.js';

/** Every `new AsyncEntry(...)` the keychain binding made, as its constructor arguments. */
const { asyncEntryCalls } = vi.hoisted(() => ({ asyncEntryCalls: [] as unknown[][] }));

vi.mock('@napi-rs/keyring', () => ({
  AsyncEntry: class {
    constructor(...args: unknown[]) {
      asyncEntryCalls.push(args);
    }

    getPassword = async (): Promise<string | null> => null;

    setPassword = async (): Promise<void> => undefined;

    deleteCredential = async (): Promise<boolean> => true;
  },
  findCredentialsAsync: async () => [],
}));

const ISSUER = 'https://issuer.example';
const CLIENT_ID = 'client-abc';
const SCOPES = ['ViewRequests', 'offline_access'];
const KEY = credentialStoreKey({ issuer: ISSUER, clientId: CLIENT_ID, scopes: SCOPES });
const HOLD_LOCK_HELPER = fileURLToPath(new URL('./helpers/hold-lock.ts', import.meta.url));

/** POSIX permission bits and symlink rules mean nothing on Windows. */
const itOnPosix = process.platform === 'win32' ? it.skip : it;

function makeTokens(overrides: Partial<StoredOAuthTokens> = {}): StoredOAuthTokens {
  return {
    accessToken: 'access-1',
    refreshToken: 'refresh-1',
    expiresAt: 1_700_000_000_000,
    issuer: ISSUER,
    clientId: CLIENT_ID,
    ...overrides,
  };
}

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

/** A pid that belonged to a process that has exited. */
function findDeadPid(): number {
  const { pid } = spawnSync(process.execPath, ['-e', '']);
  return pid;
}

describe('credential store hardening', () => {
  const logger = new SimpleLogger();
  let directory: string;
  let credentialsPath: string;

  beforeEach(async () => {
    directory = join(await mkdtemp(join(tmpdir(), 'mcp-credential-hardening-')), 'mcp');
    credentialsPath = join(directory, 'credentials.json');
    asyncEntryCalls.length = 0;
    for (const level of ['debug', 'info', 'warn', 'error'] as const) {
      vi.spyOn(logger, level).mockImplementation(() => undefined);
    }
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(join(directory, '..'), { recursive: true, force: true });
  });

  describe('saved login binding', () => {
    it('returns the tokens only under the key they were saved under', () => {
      const entry = toStoredOAuthTokensEntry(makeTokens(), KEY);
      const otherScopesKey = credentialStoreKey({
        issuer: ISSUER,
        clientId: CLIENT_ID,
        scopes: [...SCOPES, 'ManageRequestCompilation'],
      });

      expect(parseStoredOAuthTokens(entry, KEY)).toEqual(makeTokens());
      expect(parseStoredOAuthTokens(entry, otherScopesKey)).toBeNull();
    });

    it('does not let a client ID match a key that belongs to a longer client ID', () => {
      const longerClientKey = credentialStoreKey({
        issuer: ISSUER,
        clientId: 'client-abc|extra',
        scopes: SCOPES,
      });

      expect(isCredentialStoreKeyFor(longerClientKey, makeTokens())).toBe(false);
      expect(isCredentialStoreKeyFor(KEY, makeTokens())).toBe(true);
    });

    it.each([-1, 1.5, 8.7e15])('rejects an expiresAt of %s', (expiresAt) => {
      expect(
        parseStoredOAuthTokens(toStoredOAuthTokensEntry(makeTokens({ expiresAt }), KEY), KEY),
      ).toBeNull();
    });

    it('rejects a login from another issuer, in the file and in the keychain', async () => {
      const foreign = toStoredOAuthTokensEntry(
        makeTokens({ issuer: 'https://other.example' }),
        KEY,
      );
      const fileStore = createFileCredentialStore({ directory, logger });
      await mkdir(directory, { recursive: true });
      await writeFile(credentialsPath, JSON.stringify({ [KEY]: foreign }), { mode: 0o600 });
      const keyring = createFakeKeyring();
      keyring.secrets.set(KEY, JSON.stringify(foreign));
      const keyringStore = createKeyringCredentialStore({
        keyring,
        lockDirectory: directory,
        logger,
      });

      expect(await fileStore.load(KEY)).toBeNull();
      expect(await keyringStore.load(KEY)).toBeNull();
    });

    it('rejects a login from another client in the keychain', async () => {
      const keyring = createFakeKeyring();
      keyring.secrets.set(
        KEY,
        JSON.stringify(toStoredOAuthTokensEntry(makeTokens({ clientId: 'client-xyz' }), KEY)),
      );
      const store = createKeyringCredentialStore({ keyring, lockDirectory: directory, logger });

      expect(await store.load(KEY)).toBeNull();
    });
  });

  describe('refresh lock', () => {
    let lockPath: string;

    beforeEach(() => {
      lockPath = join(directory, 'refresh.lock');
    });

    async function plantLock(pid: number, host: string): Promise<void> {
      await mkdir(directory, { recursive: true });
      await writeFile(lockPath, JSON.stringify({ pid, hostname: host, ownerId: 'another-holder' }));
    }

    it('does not trust a process ID that came from another host', async () => {
      await plantLock(findDeadPid(), 'another-host.example');

      await expect(
        withLockFile(lockPath, async () => 'took over', { timeoutMs: 200 }),
      ).rejects.toBeInstanceOf(LockTimeoutError);
    });

    it('tells the holder when another process took its lock', async () => {
      await withLockFile(lockPath, async (assertHeld) => {
        await assertHeld();
        await writeFile(
          lockPath,
          JSON.stringify({ pid: process.pid, hostname: hostname(), ownerId: 'new-holder' }),
        );

        await expect(assertHeld()).rejects.toBeInstanceOf(LockLostError);
      });

      expect(JSON.parse(await readFile(lockPath, 'utf8'))).toMatchObject({ ownerId: 'new-holder' });
    });

    it('lets one of two waiters take over a stale lock at a time', async () => {
      await plantLock(findDeadPid(), hostname());
      let holders = 0;
      let mostHoldersAtOnce = 0;
      const hold = (): Promise<void> =>
        withLockFile(
          lockPath,
          async () => {
            holders += 1;
            mostHoldersAtOnce = Math.max(mostHoldersAtOnce, holders);
            await new Promise((resolve) => setTimeout(resolve, 30));
            holders -= 1;
          },
          { timeoutMs: 5_000 },
        );

      await Promise.all([hold(), hold()]);

      expect(mostHoldersAtOnce).toBe(1);
    });

    it('keeps separate processes from holding the lock together', async () => {
      await mkdir(directory, { recursive: true });
      const logPath = join(directory, 'order.log');
      const labels = ['a', 'b', 'c'];

      const exitCodes = await Promise.all(
        labels.map(
          (label) =>
            new Promise<number | null>((resolve, reject) => {
              const child = spawn(
                process.execPath,
                ['--import', 'tsx', HOLD_LOCK_HELPER, lockPath, logPath, label, '150'],
                { stdio: 'inherit' },
              );
              child.on('error', reject);
              child.on('exit', resolve);
            }),
        ),
      );

      expect(exitCodes).toEqual([0, 0, 0]);
      const events = (await readFile(logPath, 'utf8')).trim().split('\n');
      expect(events).toHaveLength(labels.length * 2);
      for (let index = 0; index < events.length; index += 2) {
        const label = events[index]!.replace('enter ', '');
        expect(events[index]).toBe(`enter ${label}`);
        expect(events[index + 1]).toBe(`exit ${label}`);
      }
    }, 30_000);
  });

  describe('config directory', () => {
    it('requires an absolute override', () => {
      expect(() => resolveMcpConfigDirectory({ TRANSCEND_MCP_CONFIG_DIR: '~/mcp' })).toThrow(
        /must be an absolute path/,
      );
      expect(() => resolveMcpConfigDirectory({ TRANSCEND_MCP_CONFIG_DIR: 'relative/mcp' })).toThrow(
        /must be an absolute path/,
      );
      expect(resolveMcpConfigDirectory({ TRANSCEND_MCP_CONFIG_DIR: directory })).toBe(directory);
    });

    itOnPosix('tightens an existing directory that only the current user owns', async () => {
      await mkdir(directory, { recursive: true, mode: 0o755 });
      await chmod(directory, 0o755);

      await ensurePrivateDirectory(directory);

      expect((await stat(directory)).mode & 0o777).toBe(0o700);
    });

    itOnPosix('refuses a symlink instead of changing its target', async () => {
      const target = join(directory, 'target');
      const link = join(directory, 'link');
      await mkdir(target, { recursive: true, mode: 0o755 });
      await chmod(target, 0o755);
      await symlink(target, link);

      await expect(ensurePrivateDirectory(link)).rejects.toThrow(/real directory/);
      expect((await stat(target)).mode & 0o777).toBe(0o755);
    });

    it('refuses a directory outside the user profile on Windows', async () => {
      await expect(ensurePrivateDirectory(directory, 'win32')).rejects.toThrow(
        /outside your user profile/,
      );
      await expect(stat(directory)).rejects.toMatchObject({ code: 'ENOENT' });
    });

    it('does not read the override for the memory store', async () => {
      const { active, all } = await resolveCredentialStores({
        logger,
        env: {
          TRANSCEND_MCP_CREDENTIAL_STORE: 'memory',
          TRANSCEND_MCP_CONFIG_DIR: 'relative/mcp',
        },
      });

      expect(active.kind).toBe(CredentialStoreKind.Memory);
      expect(all).toEqual([active]);
    });
  });

  describe('keychain on Linux', () => {
    it('pins every entry to Secret Service so listing and writing use one backend', async () => {
      const keyring = await loadOsKeyring();

      await keyring.get(KEYRING_SERVICE, 'account');
      await keyring.set(KEYRING_SERVICE, 'account', 'secret');
      await keyring.delete(KEYRING_SERVICE, 'account');

      expect(asyncEntryCalls).toHaveLength(3);
      for (const [, , options] of asyncEntryCalls) {
        expect(options).toEqual({ linux: { store: 'secret-service' } });
      }
    });
  });

  describe('file store housekeeping', () => {
    it('removes temporary files that a killed write left behind', async () => {
      const store = createFileCredentialStore({ directory, logger });
      await store.save(KEY, makeTokens());
      const abandonedPath = join(directory, 'credentials.json.abandoned.tmp');
      await writeFile(abandonedPath, JSON.stringify({ [KEY]: makeTokens() }), { mode: 0o600 });

      await store.save(KEY, makeTokens({ accessToken: 'access-2' }));

      expect(await readdir(directory)).toEqual(['credentials.json']);
    });
  });

  describe('moving file logins into the keychain', () => {
    const env = (): NodeJS.ProcessEnv => ({ TRANSCEND_MCP_CONFIG_DIR: directory });

    it('moves a login that an earlier run saved to the file', async () => {
      await createFileCredentialStore({ directory, logger }).save(KEY, makeTokens());
      const keyring = createFakeKeyring();

      const { active, all } = await resolveCredentialStores({
        logger,
        env: env(),
        loadKeyring: async () => keyring,
      });

      expect(active.kind).toBe(CredentialStoreKind.Keyring);
      expect(all.map((store) => store.kind)).toEqual([
        CredentialStoreKind.Keyring,
        CredentialStoreKind.File,
      ]);
      expect(await active.load(KEY)).toEqual(makeTokens());
      expect(await createFileCredentialStore({ directory, logger }).keys()).toEqual([]);
    });

    it('keeps the login that is already in the keychain and drops the file copy', async () => {
      await createFileCredentialStore({ directory, logger }).save(KEY, makeTokens());
      const keyring = createFakeKeyring();
      await createKeyringCredentialStore({ keyring, lockDirectory: directory, logger }).save(
        KEY,
        makeTokens({ accessToken: 'access-newer' }),
      );

      const { active } = await resolveCredentialStores({
        logger,
        env: env(),
        loadKeyring: async () => keyring,
      });

      expect((await active.load(KEY))?.accessToken).toBe('access-newer');
      expect(await createFileCredentialStore({ directory, logger }).keys()).toEqual([]);
    });

    it('starts when the move fails, and says so', async () => {
      await createFileCredentialStore({ directory, logger }).save(KEY, makeTokens());
      const keyring = {
        ...createFakeKeyring(),
        set: async () => {
          throw new Error('keychain is locked');
        },
      };

      const { active } = await resolveCredentialStores({
        logger,
        env: env(),
        loadKeyring: async () => keyring,
      });

      expect(active.kind).toBe(CredentialStoreKind.Keyring);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Could not move the saved MCP login'),
        { error: 'keychain is locked' },
      );
      expect(await createFileCredentialStore({ directory, logger }).keys()).toEqual([KEY]);
    });

    it('lists only the file when the keychain is not available', async () => {
      const { active, all } = await resolveCredentialStores({
        logger,
        env: env(),
        loadKeyring: async () => {
          throw new Error('no keychain');
        },
        platform: 'win32',
      });

      expect(all).toEqual([active]);
      expect(active.kind).toBe(CredentialStoreKind.File);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('a file in your user profile'),
        expect.anything(),
      );
    });
  });

  describe('log output', () => {
    it('never contains a token, whichever store drops an entry', async () => {
      const unreadable = { accessToken: 'access-1', refreshToken: 'refresh-1', expiresAt: -1 };
      await mkdir(directory, { recursive: true });
      await writeFile(credentialsPath, JSON.stringify({ [KEY]: unreadable }), { mode: 0o600 });
      const keyring = createFakeKeyring();
      keyring.secrets.set(KEY, JSON.stringify(unreadable));

      await createFileCredentialStore({ directory, logger }).load(KEY);
      await createKeyringCredentialStore({ keyring, lockDirectory: directory, logger }).load(KEY);
      await resolveCredentialStores({
        logger,
        env: { TRANSCEND_MCP_CONFIG_DIR: directory },
        loadKeyring: async () => {
          throw new Error('no keychain');
        },
      });

      const calls = [logger.debug, logger.info, logger.warn, logger.error].flatMap(
        (spy) => vi.mocked(spy).mock.calls,
      );
      expect(calls.length).toBeGreaterThan(0);
      const logged = JSON.stringify(calls);
      expect(logged).not.toContain('access-1');
      expect(logged).not.toContain('refresh-1');
    });
  });
});
