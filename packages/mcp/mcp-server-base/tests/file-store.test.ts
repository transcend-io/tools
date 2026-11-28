import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SimpleLogger } from '../src/clients/graphql/base.js';
import { createFileCredentialStore } from '../src/oauth/credential-store/file-store.js';
import {
  credentialStoreKey,
  toStoredOAuthTokensEntry,
} from '../src/oauth/credential-store/stored-tokens.js';
import { CredentialStoreKind } from '../src/oauth/credential-store/types.js';
import type { StoredOAuthTokens } from '../src/oauth/types.js';

const logger = new SimpleLogger();
const warnSpy = vi.spyOn(logger, 'warn');

const ISSUER = 'https://issuer.example';
const CLIENT_ID = 'client-abc';
const SCOPES = ['ViewRequests'];

const key = credentialStoreKey({ issuer: ISSUER, clientId: CLIENT_ID, scopes: SCOPES });

function makeTokens(overrides: Partial<StoredOAuthTokens> = {}): StoredOAuthTokens {
  return {
    accessToken: 'access',
    refreshToken: 'refresh',
    expiresAt: 1_700_000_000_000,
    issuer: ISSUER,
    clientId: CLIENT_ID,
    ...overrides,
  };
}

let directory: string;

beforeEach(async () => {
  warnSpy.mockClear();
  directory = await mkdtemp(join(tmpdir(), 'file-credential-store-'));
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

describe('createFileCredentialStore', () => {
  it('round-trips save, load, keys, and clear', async () => {
    const store = createFileCredentialStore({ directory, logger });
    expect(store.kind).toBe(CredentialStoreKind.File);

    const tokens = makeTokens();
    await store.save(key, tokens);
    expect(await store.keys()).toEqual([key]);
    expect(await store.load(key)).toEqual(tokens);

    await store.clear(key);
    expect(await store.keys()).toEqual([]);
    expect(await store.load(key)).toBeNull();
  });

  it('atomically replaces the credentials file via a temporary write', async () => {
    const store = createFileCredentialStore({ directory, logger });
    const filePath = join(directory, 'credentials.json');
    await store.save(key, makeTokens());
    const onDisk = await readFile(filePath, 'utf8');
    expect(onDisk).toContain('access');
    expect(onDisk).not.toContain('.tmp');
  });

  it('drops and clears a corrupt entry on load', async () => {
    const filePath = join(directory, 'credentials.json');
    await writeFile(filePath, JSON.stringify({ [key]: { not: 'tokens' } }), { mode: 0o600 });

    const store = createFileCredentialStore({ directory, logger });
    expect(await store.load(key)).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      'Dropping a saved MCP login that could not be read',
      expect.objectContaining({ filePath }),
    );
    expect(await store.keys()).toEqual([]);
  });

  it('ignores a credentials file that is not owner-only on Unix', async () => {
    if (process.getuid === undefined) return;

    const filePath = join(directory, 'credentials.json');
    await writeFile(
      filePath,
      JSON.stringify({
        [key]: toStoredOAuthTokensEntry(makeTokens(), key),
      }),
      { mode: 0o644 },
    );

    const store = createFileCredentialStore({ directory, logger });
    expect(await store.load(key)).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('owner can read'),
      expect.objectContaining({ filePath }),
    );
  });

  it('ignores a symlinked credentials file on Unix', async () => {
    if (process.platform === 'win32') return;

    const target = join(directory, 'target.json');
    const filePath = join(directory, 'credentials.json');
    await writeFile(target, '{}', { mode: 0o600 });
    await symlink(target, filePath);

    const store = createFileCredentialStore({ directory, logger });
    expect(await store.load(key)).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      'Ignoring the saved MCP login: the credentials file is a symlink',
      expect.objectContaining({ filePath }),
    );
  });

  it('runs withRefreshLock without error', async () => {
    const store = createFileCredentialStore({ directory, logger });
    await store.save(key, makeTokens());
    const value = await store.withRefreshLock(key, async () => 'locked');
    expect(value).toBe('locked');
  });
});
