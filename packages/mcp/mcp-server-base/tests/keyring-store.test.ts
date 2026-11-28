import { describe, expect, it, vi } from 'vitest';

import { SimpleLogger } from '../src/clients/graphql/base.js';
import {
  createKeyringCredentialStore,
  KEYRING_SERVICE,
} from '../src/oauth/credential-store/keyring-store.js';
import {
  credentialStoreKey,
  toStoredOAuthTokensEntry,
} from '../src/oauth/credential-store/stored-tokens.js';
import { CredentialStoreKind, type Keyring } from '../src/oauth/credential-store/types.js';
import type { StoredOAuthTokens } from '../src/oauth/types.js';

const logger = new SimpleLogger();

const ISSUER = 'https://issuer.example';
const CLIENT_ID = 'client-abc';
const SCOPES = ['ViewRequests'];

const key = credentialStoreKey({ issuer: ISSUER, clientId: CLIENT_ID, scopes: SCOPES });

function makeTokens(): StoredOAuthTokens {
  return {
    accessToken: 'access',
    refreshToken: 'refresh',
    expiresAt: 1_700_000_000_000,
    issuer: ISSUER,
    clientId: CLIENT_ID,
  };
}

function createMockKeyring(): Keyring & { secrets: Map<string, string> } {
  const secrets = new Map<string, string>();
  return {
    secrets,
    get: vi.fn(async (service, account) => {
      expect(service).toBe(KEYRING_SERVICE);
      return secrets.get(account) ?? null;
    }),
    set: vi.fn(async (service, account, secret) => {
      expect(service).toBe(KEYRING_SERVICE);
      secrets.set(account, secret);
    }),
    delete: vi.fn(async (service, account) => {
      expect(service).toBe(KEYRING_SERVICE);
      secrets.delete(account);
    }),
    accounts: vi.fn(async (service) => {
      expect(service).toBe(KEYRING_SERVICE);
      return [...secrets.keys()];
    }),
  };
}

describe('createKeyringCredentialStore', () => {
  it('round-trips save, load, keys, and clear', async () => {
    const keyring = createMockKeyring();
    const store = createKeyringCredentialStore({
      keyring,
      lockDirectory: '/tmp/lock-dir',
      logger,
    });
    expect(store.kind).toBe(CredentialStoreKind.Keyring);

    const tokens = makeTokens();
    await store.save(key, tokens);
    expect(await store.keys()).toEqual([key]);
    expect(await store.load(key)).toEqual(tokens);

    await store.clear(key);
    expect(await store.keys()).toEqual([]);
    expect(await store.load(key)).toBeNull();
  });

  it('drops and deletes an entry that cannot be parsed', async () => {
    const warnSpy = vi.spyOn(logger, 'warn');
    const keyring = createMockKeyring();
    keyring.secrets.set(key, 'not-json');
    const store = createKeyringCredentialStore({
      keyring,
      lockDirectory: '/tmp/lock-dir',
      logger,
    });

    expect(await store.load(key)).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith('Dropping a saved MCP login that could not be read');
    expect(keyring.delete).toHaveBeenCalledWith(KEYRING_SERVICE, key);
  });

  it('persists the keyed entry shape that parseSerializedOAuthTokens expects', async () => {
    const keyring = createMockKeyring();
    const store = createKeyringCredentialStore({
      keyring,
      lockDirectory: '/tmp/lock-dir',
      logger,
    });
    const tokens = makeTokens();
    await store.save(key, tokens);
    expect(keyring.secrets.get(key)).toBe(JSON.stringify(toStoredOAuthTokensEntry(tokens, key)));
  });
});
