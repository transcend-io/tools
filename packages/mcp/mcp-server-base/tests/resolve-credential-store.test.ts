import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SimpleLogger } from '../src/clients/graphql/base.js';
import { TRANSCEND_MCP_CREDENTIAL_STORE_ENV } from '../src/oauth/constants.js';
import {
  parseCredentialStoreKind,
  resolveCredentialStores,
} from '../src/oauth/credential-store/resolve-credential-store.js';
import { CredentialStoreKind, type Keyring } from '../src/oauth/credential-store/types.js';

const logger = new SimpleLogger();

const mockKeyring: Keyring = {
  get: async () => null,
  set: async () => undefined,
  delete: async () => undefined,
  accounts: async () => [],
};

let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'resolve-credential-store-'));
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

describe('parseCredentialStoreKind', () => {
  it('defaults to auto when unset', () => {
    expect(parseCredentialStoreKind(undefined)).toBe(CredentialStoreKind.Auto);
  });

  it('accepts each store kind case-insensitively', () => {
    expect(parseCredentialStoreKind('FILE')).toBe(CredentialStoreKind.File);
    expect(parseCredentialStoreKind('memory')).toBe(CredentialStoreKind.Memory);
  });

  it('rejects an unknown value', () => {
    expect(() => parseCredentialStoreKind('bogus')).toThrow(/must be one of/);
  });
});

describe('resolveCredentialStores', () => {
  it('returns memory when asked for memory', async () => {
    const resolved = await resolveCredentialStores({
      logger,
      env: { [TRANSCEND_MCP_CREDENTIAL_STORE_ENV]: CredentialStoreKind.Memory },
    });
    expect(resolved.active.kind).toBe(CredentialStoreKind.Memory);
    expect(resolved.all).toHaveLength(1);
  });

  it('returns a file store when asked for file', async () => {
    const resolved = await resolveCredentialStores({
      logger,
      env: {
        [TRANSCEND_MCP_CREDENTIAL_STORE_ENV]: CredentialStoreKind.File,
        TRANSCEND_MCP_CONFIG_DIR: directory,
      },
    });
    expect(resolved.active.kind).toBe(CredentialStoreKind.File);
    expect(resolved.all).toHaveLength(1);
  });

  it('falls back to the file when auto cannot reach the keychain', async () => {
    const resolved = await resolveCredentialStores({
      logger,
      env: {
        [TRANSCEND_MCP_CREDENTIAL_STORE_ENV]: CredentialStoreKind.Auto,
        TRANSCEND_MCP_CONFIG_DIR: directory,
      },
      loadKeyring: async () => {
        throw new Error('no native keyring');
      },
    });
    expect(resolved.active.kind).toBe(CredentialStoreKind.File);
    expect(resolved.keychainUnavailable).toMatch(/no native keyring/);
  });

  it('throws when keyring is required but unavailable', async () => {
    await expect(
      resolveCredentialStores({
        logger,
        env: { [TRANSCEND_MCP_CREDENTIAL_STORE_ENV]: CredentialStoreKind.Keyring },
        loadKeyring: async () => {
          throw new Error('no native keyring');
        },
      }),
    ).rejects.toThrow(/keychain is not available/);
  });

  it('uses the keychain in auto mode when the probe succeeds', async () => {
    const resolved = await resolveCredentialStores({
      logger,
      env: {
        [TRANSCEND_MCP_CREDENTIAL_STORE_ENV]: CredentialStoreKind.Auto,
        TRANSCEND_MCP_CONFIG_DIR: directory,
      },
      loadKeyring: async () => mockKeyring,
      keyringLockDirectory: directory,
    });
    expect(resolved.active.kind).toBe(CredentialStoreKind.Keyring);
    expect(resolved.all.length).toBeGreaterThanOrEqual(2);
  });
});
