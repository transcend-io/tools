import { describe, expect, it } from 'vitest';

import { createMemoryCredentialStore } from '../src/oauth/credential-store/memory-store.js';
import {
  credentialStoreKey,
  isCredentialStoreKeyFor,
  MAX_ACCESS_TOKEN_EXPIRES_AHEAD_MS,
  parseStoredOAuthTokens,
  parseSerializedOAuthTokens,
  toStoredOAuthTokensEntry,
} from '../src/oauth/credential-store/stored-tokens.js';
import type { StoredOAuthTokens } from '../src/oauth/types.js';

const ISSUER = 'https://issuer.example';
const CLIENT_ID = 'client-abc';
const SCOPES = ['ViewRequests', 'offline_access'];

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

describe('credentialStoreKey', () => {
  it('is the same for the same issuer, client, and scopes in any order', () => {
    const key = credentialStoreKey({ issuer: ISSUER, clientId: CLIENT_ID, scopes: SCOPES });
    expect(
      credentialStoreKey({
        issuer: `${ISSUER}/`,
        clientId: CLIENT_ID,
        scopes: [...SCOPES].reverse(),
      }),
    ).toBe(key);
  });

  it('differs when the scopes differ', () => {
    expect(credentialStoreKey({ issuer: ISSUER, clientId: CLIENT_ID, scopes: SCOPES })).not.toBe(
      credentialStoreKey({ issuer: ISSUER, clientId: CLIENT_ID, scopes: ['ViewDataMap'] }),
    );
  });

  it('gives two issuer and client pairs that differ only by a "|" different keys', () => {
    const first = credentialStoreKey({ issuer: 'https://a|b', clientId: 'c', scopes: SCOPES });
    const second = credentialStoreKey({ issuer: 'https://a', clientId: 'b|c', scopes: SCOPES });
    expect(first).not.toBe(second);
  });
});

describe('isCredentialStoreKeyFor', () => {
  it('rejects a key that belongs to a client ID that contains the delimiter', () => {
    const key = credentialStoreKey({ issuer: ISSUER, clientId: 'b|c', scopes: SCOPES });
    expect(isCredentialStoreKeyFor(key, makeTokens({ clientId: 'b' }))).toBe(false);
    expect(isCredentialStoreKeyFor(key, makeTokens({ clientId: 'b|c' }))).toBe(true);
  });
});

describe('parseStoredOAuthTokens', () => {
  const key = credentialStoreKey({ issuer: ISSUER, clientId: CLIENT_ID, scopes: SCOPES });

  it('returns the tokens of an entry saved under the same key', () => {
    expect(parseStoredOAuthTokens(toStoredOAuthTokensEntry(makeTokens(), key), key)).toEqual(
      makeTokens(),
    );
  });

  it('returns null for an entry saved under another key', () => {
    const otherKey = credentialStoreKey({ issuer: ISSUER, clientId: CLIENT_ID, scopes: ['x'] });
    expect(
      parseStoredOAuthTokens(toStoredOAuthTokensEntry(makeTokens(), otherKey), key),
    ).toBeNull();
  });

  it('returns null for an entry whose issuer does not match the key', () => {
    const entry = toStoredOAuthTokensEntry(makeTokens({ issuer: 'https://other.example' }), key);
    expect(parseStoredOAuthTokens(entry, key)).toBeNull();
  });

  it.each([-1, 1.5, 9e15, Number.NaN, '1'])('returns null for expiresAt %j', (expiresAt) => {
    const entry = { ...toStoredOAuthTokensEntry(makeTokens(), key), expiresAt };
    expect(parseStoredOAuthTokens(entry, key)).toBeNull();
  });

  it('returns null when expiresAt is implausibly far in the future', () => {
    const nowMs = 1_700_000_000_000;
    const entry = toStoredOAuthTokensEntry(
      makeTokens({ expiresAt: nowMs + MAX_ACCESS_TOKEN_EXPIRES_AHEAD_MS + 1 }),
      key,
    );
    expect(parseStoredOAuthTokens(entry, key, nowMs)).toBeNull();
  });

  it('treats malformed JSON as no entry', () => {
    expect(parseSerializedOAuthTokens('{not json', key)).toBeNull();
  });
});

describe('createMemoryCredentialStore', () => {
  const key = credentialStoreKey({ issuer: ISSUER, clientId: CLIENT_ID, scopes: SCOPES });

  it('refuses to save a login under the key of another issuer', async () => {
    const store = createMemoryCredentialStore();
    await expect(store.save(key, makeTokens({ issuer: 'https://other.example' }))).rejects.toThrow(
      /does not belong/,
    );
    expect(await store.load(key)).toBeNull();
  });

  it('keeps its own copy, so changing a saved or loaded login changes nothing', async () => {
    const store = createMemoryCredentialStore();
    const tokens = makeTokens();
    await store.save(key, tokens);

    tokens.accessToken = 'changed-after-save';
    const loaded = await store.load(key);
    loaded!.accessToken = 'changed-after-load';

    expect(await store.load(key)).toEqual(makeTokens());
  });

  it('runs refreshes of one key one at a time', async () => {
    const store = createMemoryCredentialStore();
    const order: string[] = [];
    const first = store.withRefreshLock(key, async () => {
      order.push('first:start');
      await new Promise((resolve) => setTimeout(resolve, 20));
      order.push('first:end');
    });
    const second = store.withRefreshLock(key, async () => {
      order.push('second');
    });
    await Promise.all([first, second]);
    expect(order).toEqual(['first:start', 'first:end', 'second']);
  });
});
