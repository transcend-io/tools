import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SimpleLogger } from '../src/clients/graphql/base.js';
import { createFallbackCredentialStore } from '../src/oauth/credential-store/fallback-store.js';
import { createMemoryCredentialStore } from '../src/oauth/credential-store/memory-store.js';
import {
  credentialStoreKey,
  toStoredOAuthTokensEntry,
} from '../src/oauth/credential-store/stored-tokens.js';
import type { CredentialStore } from '../src/oauth/credential-store/types.js';

let logger: SimpleLogger;

beforeEach(() => {
  logger = new SimpleLogger();
});

const key = credentialStoreKey({
  issuer: 'https://api.transcend.io/',
  clientId: 'test-client',
  scopes: ['openid'],
});

const sampleTokens = toStoredOAuthTokensEntry(
  {
    accessToken: 'access',
    refreshToken: 'refresh',
    expiresAt: Date.now() + 60_000,
    issuer: 'https://api.transcend.io/',
    clientId: 'test-client',
  },
  key,
);

function withOverrides(
  store: CredentialStore,
  overrides: Partial<CredentialStore>,
): CredentialStore {
  return { ...store, ...overrides };
}

describe('createFallbackCredentialStore', () => {
  it('rethrows when the keychain refuses to list logins', async () => {
    const primary = withOverrides(createMemoryCredentialStore(), {
      keys: async () => {
        throw new Error('keychain locked');
      },
    });
    const fallback = createMemoryCredentialStore();
    const store = createFallbackCredentialStore({ primary, fallback, logger });

    await expect(store.keys()).rejects.toThrow(/keychain locked/);
  });

  it('rethrows a keychain read failure when the file has no login', async () => {
    const primary = withOverrides(createMemoryCredentialStore(), {
      load: async () => {
        throw new Error('keychain locked');
      },
    });
    const fallback = createMemoryCredentialStore();
    const store = createFallbackCredentialStore({ primary, fallback, logger });

    await expect(store.load(key)).rejects.toThrow(/keychain locked/);
  });

  it('warns when the file login is newer than the keychain copy', async () => {
    const warn = vi.spyOn(logger, 'warn');
    const primary = createMemoryCredentialStore();
    const fallback = createMemoryCredentialStore();
    const keychainTokens = { ...sampleTokens, expiresAt: Date.now() + 60_000 };
    const fileTokens = { ...sampleTokens, expiresAt: Date.now() + 120_000 };
    await primary.save(key, keychainTokens);
    await fallback.save(key, fileTokens);
    const store = createFallbackCredentialStore({ primary, fallback, logger });

    const loaded = await store.load(key);
    expect(loaded).toEqual(fileTokens);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('owner-only file'),
      expect.objectContaining({ credentialStoreKey: key }),
    );
  });

  it('returns the file login when the keychain read fails and the file has an entry', async () => {
    const primary = withOverrides(createMemoryCredentialStore(), {
      load: async () => {
        throw new Error('keychain locked');
      },
    });
    const fallback = createMemoryCredentialStore();
    await fallback.save(key, sampleTokens);
    const store = createFallbackCredentialStore({ primary, fallback, logger });

    const loaded = await store.load(key);
    expect(loaded).toEqual(sampleTokens);
  });
});
