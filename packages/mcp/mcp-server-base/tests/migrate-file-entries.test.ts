import { describe, expect, it } from 'vitest';

import { SimpleLogger } from '../src/clients/graphql/base.js';
import { createMemoryCredentialStore } from '../src/oauth/credential-store/memory-store.js';
import { migrateFileEntriesToKeyring } from '../src/oauth/credential-store/migrate-file-entries.js';
import {
  credentialStoreKey,
  toStoredOAuthTokensEntry,
} from '../src/oauth/credential-store/stored-tokens.js';

const logger = new SimpleLogger();

const ISSUER = 'https://issuer.example';
const CLIENT_ID = 'client-abc';
const SCOPES = ['ViewRequests'];

const key = credentialStoreKey({ issuer: ISSUER, clientId: CLIENT_ID, scopes: SCOPES });

describe('migrateFileEntriesToKeyring', () => {
  it('moves a file-only login into the keyring and clears the file', async () => {
    const fileStore = createMemoryCredentialStore();
    const keyringStore = createMemoryCredentialStore();
    const tokens = toStoredOAuthTokensEntry(
      {
        accessToken: 'access',
        refreshToken: 'refresh',
        expiresAt: 1_700_000_000_000,
        issuer: ISSUER,
        clientId: CLIENT_ID,
      },
      key,
    );
    await fileStore.save(key, tokens);

    await migrateFileEntriesToKeyring({ fileStore, keyringStore, logger });

    expect(await keyringStore.load(key)).toEqual(tokens);
    expect(await fileStore.load(key)).toBeNull();
  });

  it('keeps the keychain copy when its token expires later', async () => {
    const fileStore = createMemoryCredentialStore();
    const keyringStore = createMemoryCredentialStore();
    const fileTokens = toStoredOAuthTokensEntry(
      {
        accessToken: 'file',
        refreshToken: 'file-refresh',
        expiresAt: 1_700_000_000_000,
        issuer: ISSUER,
        clientId: CLIENT_ID,
      },
      key,
    );
    const keyringTokens = toStoredOAuthTokensEntry(
      {
        accessToken: 'keychain',
        refreshToken: 'keychain-refresh',
        expiresAt: 1_800_000_000_000,
        issuer: ISSUER,
        clientId: CLIENT_ID,
      },
      key,
    );
    await fileStore.save(key, fileTokens);
    await keyringStore.save(key, keyringTokens);

    await migrateFileEntriesToKeyring({ fileStore, keyringStore, logger });

    expect(await keyringStore.load(key)).toEqual(keyringTokens);
    expect(await fileStore.load(key)).toBeNull();
  });

  it('replaces the keychain copy when the file token expires later', async () => {
    const fileStore = createMemoryCredentialStore();
    const keyringStore = createMemoryCredentialStore();
    const fileTokens = toStoredOAuthTokensEntry(
      {
        accessToken: 'file',
        refreshToken: 'file-refresh',
        expiresAt: 1_900_000_000_000,
        issuer: ISSUER,
        clientId: CLIENT_ID,
      },
      key,
    );
    const keyringTokens = toStoredOAuthTokensEntry(
      {
        accessToken: 'keychain',
        refreshToken: 'keychain-refresh',
        expiresAt: 1_800_000_000_000,
        issuer: ISSUER,
        clientId: CLIENT_ID,
      },
      key,
    );
    await fileStore.save(key, fileTokens);
    await keyringStore.save(key, keyringTokens);

    await migrateFileEntriesToKeyring({ fileStore, keyringStore, logger });

    expect(await keyringStore.load(key)).toEqual(fileTokens);
    expect(await fileStore.load(key)).toBeNull();
  });
});
