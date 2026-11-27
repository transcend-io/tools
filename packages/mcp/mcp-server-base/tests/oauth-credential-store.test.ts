import {
  chmod,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  symlink,
  utimes,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SimpleLogger } from '../src/clients/graphql/base.js';
import { createFileCredentialStore } from '../src/oauth/credential-store/file-store.js';
import {
  createKeyringCredentialStore,
  KEYRING_SERVICE,
} from '../src/oauth/credential-store/keyring-store.js';
import {
  LockTimeoutError,
  REFRESH_LOCK_STALE_MS,
  withLockFile,
} from '../src/oauth/credential-store/refresh-lock.js';
import {
  parseCredentialStoreKind,
  resolveCredentialStore,
} from '../src/oauth/credential-store/resolve-credential-store.js';
import { credentialStoreKey } from '../src/oauth/credential-store/stored-tokens.js';
import { CredentialStoreKind, type Keyring } from '../src/oauth/credential-store/types.js';
import type { StoredOAuthTokens } from '../src/oauth/types.js';

const ISSUER = 'https://issuer.example';
const CLIENT_ID = 'client-abc';
const SCOPES = ['ViewRequests', 'offline_access'];
const KEY = credentialStoreKey({ issuer: ISSUER, clientId: CLIENT_ID, scopes: SCOPES });

/** POSIX permission bits mean nothing on Windows. */
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
function createFakeKeyring(): Keyring & {
  /** Secrets by account */
  secrets: Map<string, string>;
} {
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

async function permissionBits(path: string): Promise<number> {
  return (await stat(path)).mode & 0o777;
}

describe('credential store', () => {
  const logger = new SimpleLogger();
  let directory: string;
  let credentialsPath: string;

  beforeEach(async () => {
    // A nested path, so the store has to create its own directory.
    directory = join(await mkdtemp(join(tmpdir(), 'mcp-credential-store-')), 'mcp');
    credentialsPath = join(directory, 'credentials.json');
    vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(join(directory, '..'), { recursive: true, force: true });
  });

  describe('file store', () => {
    it('round-trips a login and leaves no temporary or lock files behind', async () => {
      const store = createFileCredentialStore({ directory, logger });
      const tokens = makeTokens();

      await store.save(KEY, tokens);

      expect(await store.load(KEY)).toEqual(tokens);
      expect(await store.keys()).toEqual([KEY]);
      expect(await readdir(directory)).toEqual(['credentials.json']);
    });

    itOnPosix('writes an owner-only file in an owner-only directory', async () => {
      const store = createFileCredentialStore({ directory, logger });

      await store.save(KEY, makeTokens());

      expect(await permissionBits(credentialsPath)).toBe(0o600);
      expect(await permissionBits(directory)).toBe(0o700);
    });

    it('keeps the logins of different issuers and clients apart', async () => {
      const store = createFileCredentialStore({ directory, logger });
      const otherIssuerKey = credentialStoreKey({
        issuer: 'https://other.example',
        clientId: CLIENT_ID,
        scopes: SCOPES,
      });
      const otherClientKey = credentialStoreKey({
        issuer: ISSUER,
        clientId: 'client-xyz',
        scopes: SCOPES,
      });
      const otherIssuerTokens = makeTokens({
        issuer: 'https://other.example',
        accessToken: 'access-other-issuer',
      });
      const otherClientTokens = makeTokens({
        clientId: 'client-xyz',
        accessToken: 'access-other-client',
      });

      await store.save(KEY, makeTokens());
      await store.save(otherIssuerKey, otherIssuerTokens);
      await store.save(otherClientKey, otherClientTokens);
      await store.clear(KEY);

      expect(await store.load(KEY)).toBeNull();
      expect(await store.load(otherIssuerKey)).toEqual(otherIssuerTokens);
      expect(await store.load(otherClientKey)).toEqual(otherClientTokens);
    });

    it('keeps every entry when several saves run at once', async () => {
      const store = createFileCredentialStore({ directory, logger });
      const clientIds = ['client-1', 'client-2', 'client-3', 'client-4'];

      await Promise.all(
        clientIds.map((clientId) =>
          store.save(
            credentialStoreKey({ issuer: ISSUER, clientId, scopes: SCOPES }),
            makeTokens({ clientId }),
          ),
        ),
      );

      expect((await store.keys()).sort()).toEqual(
        clientIds.map((clientId) =>
          credentialStoreKey({ issuer: ISSUER, clientId, scopes: SCOPES }),
        ),
      );
    });

    it('treats a corrupt file as no login and replaces it on the next save', async () => {
      const store = createFileCredentialStore({ directory, logger });
      await store.save(KEY, makeTokens());
      await writeFile(credentialsPath, '{"half a file', { mode: 0o600 });

      expect(await store.load(KEY)).toBeNull();
      expect(await store.keys()).toEqual([]);

      const replacement = makeTokens({ accessToken: 'access-2' });
      await store.save(KEY, replacement);
      expect(await store.load(KEY)).toEqual(replacement);
    });

    it('drops an entry that has the wrong shape', async () => {
      const store = createFileCredentialStore({ directory, logger });
      await store.save(KEY, makeTokens());
      await writeFile(credentialsPath, JSON.stringify({ [KEY]: { accessToken: 42 } }), {
        mode: 0o600,
      });

      expect(await store.load(KEY)).toBeNull();
      expect(JSON.parse(await readFile(credentialsPath, 'utf8'))).toEqual({});
    });

    it('does not hand a login to a key it was not saved for', async () => {
      const store = createFileCredentialStore({ directory, logger });
      const otherClientKey = credentialStoreKey({
        issuer: ISSUER,
        clientId: 'client-xyz',
        scopes: SCOPES,
      });
      await store.save(KEY, makeTokens());
      await writeFile(credentialsPath, JSON.stringify({ [otherClientKey]: makeTokens() }), {
        mode: 0o600,
      });

      expect(await store.load(otherClientKey)).toBeNull();
    });

    itOnPosix('ignores a file that others can read, then replaces it', async () => {
      const store = createFileCredentialStore({ directory, logger });
      await store.save(KEY, makeTokens());
      await chmod(credentialsPath, 0o644);

      expect(await store.load(KEY)).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('only its owner can read'),
        expect.anything(),
      );

      await store.save(KEY, makeTokens({ accessToken: 'access-2' }));
      expect(await permissionBits(credentialsPath)).toBe(0o600);
      expect((await store.load(KEY))?.accessToken).toBe('access-2');
    });

    itOnPosix('ignores a symlinked file and never writes through it', async () => {
      const store = createFileCredentialStore({ directory, logger });
      await store.save(KEY, makeTokens());
      const targetPath = join(directory, 'elsewhere.json');
      const targetContent = JSON.stringify({ [KEY]: makeTokens({ accessToken: 'planted' }) });
      await writeFile(targetPath, targetContent, { mode: 0o600 });
      await rm(credentialsPath);
      await symlink(targetPath, credentialsPath);

      expect(await store.load(KEY)).toBeNull();

      await store.save(KEY, makeTokens({ accessToken: 'access-2' }));
      expect(await readFile(targetPath, 'utf8')).toBe(targetContent);
      expect((await store.load(KEY))?.accessToken).toBe('access-2');
    });
  });

  describe('credentialStoreKey', () => {
    it('is the same for the same scopes in any order, with or without repeats', () => {
      expect(
        credentialStoreKey({
          issuer: `${ISSUER}/`,
          clientId: CLIENT_ID,
          scopes: ['offline_access', 'ViewRequests', 'offline_access'],
        }),
      ).toBe(KEY);
    });

    it('differs when the scopes asked for differ', () => {
      expect(
        credentialStoreKey({
          issuer: ISSUER,
          clientId: CLIENT_ID,
          scopes: [...SCOPES, 'ManageRequestCompilation'],
        }),
      ).not.toBe(KEY);
    });

    it('never contains a scope, a token, or anything else worth hiding', () => {
      expect(KEY).toMatch(/^https:\/\/issuer\.example\|client-abc\|[0-9a-f]{16}$/);
    });
  });

  describe('keyring store', () => {
    it('saves one keychain entry per login', async () => {
      const keyring = createFakeKeyring();
      const store = createKeyringCredentialStore({ keyring, lockDirectory: directory, logger });
      const tokens = makeTokens();

      await store.save(KEY, tokens);

      expect(await keyring.get(KEYRING_SERVICE, KEY)).toBe(JSON.stringify(tokens));
      expect(await store.load(KEY)).toEqual(tokens);
      expect(await store.keys()).toEqual([KEY]);

      await store.clear(KEY);
      expect(await store.load(KEY)).toBeNull();
    });

    it('drops an entry that cannot be parsed', async () => {
      const keyring = createFakeKeyring();
      const store = createKeyringCredentialStore({ keyring, lockDirectory: directory, logger });
      keyring.secrets.set(KEY, 'not json');

      expect(await store.load(KEY)).toBeNull();
      expect(keyring.secrets.has(KEY)).toBe(false);
    });
  });

  describe('resolveCredentialStore', () => {
    const envFor = (kind?: string): NodeJS.ProcessEnv => ({
      TRANSCEND_MCP_CONFIG_DIR: directory,
      ...(kind === undefined ? {} : { TRANSCEND_MCP_CREDENTIAL_STORE: kind }),
    });

    it('uses the keychain by default when it answers', async () => {
      const store = await resolveCredentialStore({
        logger,
        env: envFor(),
        loadKeyring: async () => createFakeKeyring(),
      });

      expect(store.kind).toBe(CredentialStoreKind.Keyring);
    });

    it('falls back to the file when the keychain binding cannot be imported', async () => {
      const store = await resolveCredentialStore({
        logger,
        env: envFor('auto'),
        loadKeyring: async () => {
          throw new Error("Cannot find module '@napi-rs/keyring'");
        },
      });

      expect(store.kind).toBe(CredentialStoreKind.File);
      expect(store.location).toBe(credentialsPath);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('keychain is not available'),
        expect.anything(),
      );
    });

    it('falls back to the file when the keychain does not answer a read', async () => {
      const store = await resolveCredentialStore({
        logger,
        env: envFor(),
        loadKeyring: async () => ({
          ...createFakeKeyring(),
          get: async () => {
            throw new Error('no secret service on this machine');
          },
        }),
      });

      expect(store.kind).toBe(CredentialStoreKind.File);
    });

    it('fails instead of falling back when the keychain is asked for by name', async () => {
      await expect(
        resolveCredentialStore({
          logger,
          env: envFor('keyring'),
          loadKeyring: async () => {
            throw new Error('unsupported platform');
          },
        }),
      ).rejects.toThrow(/keychain is not available: unsupported platform/);
    });

    it('uses the file when asked, without loading the keychain', async () => {
      const loadKeyring = vi.fn();

      const store = await resolveCredentialStore({ logger, env: envFor('file'), loadKeyring });

      expect(store.kind).toBe(CredentialStoreKind.File);
      expect(loadKeyring).not.toHaveBeenCalled();
    });

    it('never writes anything for the memory store', async () => {
      const loadKeyring = vi.fn();
      const store = await resolveCredentialStore({ logger, env: envFor('memory'), loadKeyring });

      await store.save(KEY, makeTokens());
      const loaded = await store.withRefreshLock(KEY, () => store.load(KEY));

      expect(loaded).toEqual(makeTokens());
      expect(loadKeyring).not.toHaveBeenCalled();
      await expect(stat(directory)).rejects.toMatchObject({ code: 'ENOENT' });
    });

    it('rejects a value that names no store', () => {
      expect(() => parseCredentialStoreKind('keychain')).toThrow(
        /TRANSCEND_MCP_CREDENTIAL_STORE must be one of auto, keyring, file, memory/,
      );
      expect(parseCredentialStoreKind(undefined)).toBe(CredentialStoreKind.Auto);
      expect(parseCredentialStoreKind(' File ')).toBe(CredentialStoreKind.File);
    });
  });

  describe('withLockFile', () => {
    let lockPath: string;

    beforeEach(() => {
      lockPath = join(directory, 'refresh.lock');
    });

    /** Writes a lock as another holder would have left it. */
    async function plantLock(pid: number, ageMs = 0): Promise<void> {
      await mkdir(directory, { recursive: true });
      await writeFile(lockPath, JSON.stringify({ pid, ownerId: 'another-holder' }));
      const renewedAt = new Date(Date.now() - ageMs);
      await utimes(lockPath, renewedAt, renewedAt);
    }

    /** A pid that belonged to a process that has exited. */
    async function findDeadPid(): Promise<number> {
      const { spawnSync } = await import('node:child_process');
      const { pid } = spawnSync(process.execPath, ['-e', '']);
      return pid;
    }

    it('runs one holder at a time', async () => {
      let holders = 0;
      let mostHoldersAtOnce = 0;
      const hold = (): Promise<void> =>
        withLockFile(lockPath, async () => {
          holders += 1;
          mostHoldersAtOnce = Math.max(mostHoldersAtOnce, holders);
          await sleep(20);
          holders -= 1;
        });

      await Promise.all([hold(), hold(), hold(), hold()]);

      expect(mostHoldersAtOnce).toBe(1);
      expect(await readdir(directory)).toEqual([]);
    });

    it('releases the lock when the task throws', async () => {
      await expect(
        withLockFile(lockPath, async () => {
          throw new Error('task failed');
        }),
      ).rejects.toThrow('task failed');

      await expect(withLockFile(lockPath, async () => 'next holder')).resolves.toBe('next holder');
    });

    it('takes over a lock whose process is gone', async () => {
      await plantLock(await findDeadPid());

      await expect(
        withLockFile(lockPath, async () => 'took over', { timeoutMs: 2_000 }),
      ).resolves.toBe('took over');
    });

    it('takes over a lock that went unrenewed past the stale window', async () => {
      await plantLock(process.pid, REFRESH_LOCK_STALE_MS + 1_000);

      await expect(
        withLockFile(lockPath, async () => 'took over', { timeoutMs: 2_000 }),
      ).resolves.toBe('took over');
    });

    it('times out instead of taking a lock from a live, recent holder', async () => {
      await plantLock(process.pid);

      await expect(
        withLockFile(lockPath, async () => 'took over', { timeoutMs: 150 }),
      ).rejects.toBeInstanceOf(LockTimeoutError);
      expect(JSON.parse(await readFile(lockPath, 'utf8'))).toMatchObject({
        ownerId: 'another-holder',
      });
    });

    it('never takes a lock from a slow holder that keeps renewing it', async () => {
      const events: string[] = [];
      const slowHolder = withLockFile(
        lockPath,
        async () => {
          events.push('slow holder started');
          await sleep(500);
          events.push('slow holder finished');
        },
        { staleMs: 150, renewMs: 30 },
      );
      await vi.waitFor(() => expect(events).toEqual(['slow holder started']));

      await withLockFile(
        lockPath,
        async () => {
          events.push('waiter started');
        },
        { staleMs: 150 },
      );
      await slowHolder;

      expect(events).toEqual(['slow holder started', 'slow holder finished', 'waiter started']);
    });

    it('leaves a lock alone once another holder has taken it over', async () => {
      await withLockFile(lockPath, async () => {
        await plantLock(process.pid);
      });

      expect(JSON.parse(await readFile(lockPath, 'utf8'))).toMatchObject({
        ownerId: 'another-holder',
      });
    });
  });
});
