import { describe, expect, it } from 'vitest';

import { SimpleLogger } from '../src/clients/graphql/base.js';
import { createFallbackCredentialStore } from '../src/oauth/credential-store/fallback-store.js';
import { createMemoryCredentialStore } from '../src/oauth/credential-store/memory-store.js';
import {
  credentialStoreKey,
  toStoredOAuthTokensEntry,
} from '../src/oauth/credential-store/stored-tokens.js';
import type { CredentialStore } from '../src/oauth/credential-store/types.js';

const logger = new SimpleLogger();

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
