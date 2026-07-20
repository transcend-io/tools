import { createECDH } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  createDhEncrypted,
  createDhEncryptionKeys,
  decrypt,
  decryptDecryptionContext,
  encrypt,
  hkdf,
  SOMBRA_ECDH_CURVE,
  toBuffer,
} from '../dhEncryption.js';

/**
 * Simulate a Sombra gateway: generate a server-side ECDH key pair and derive
 * the same channel KEK from the client's public key.
 *
 * @returns The server public key and a KEK derivation function
 */
function createFakeSombra(): {
  /** The server's ECDH public key, base64 */
  publicKey: string;
  /** Derive the shared KEK from a client public key */
  deriveKek: (clientPublicKey: string) => Buffer;
} {
  const ecdh = createECDH(SOMBRA_ECDH_CURVE);
  const publicKey = ecdh.generateKeys('base64', 'uncompressed');
  return {
    publicKey,
    deriveKek: (clientPublicKey: string) => hkdf(ecdh.computeSecret(clientPublicKey, 'base64')),
  };
}

describe('dhEncryption', () => {
  it('derives the same KEK on both sides of the channel', () => {
    const sombra = createFakeSombra();
    const keys = createDhEncryptionKeys(sombra.publicKey);
    const serverKek = sombra.deriveKek(keys.publicKey);
    expect(toBuffer(keys.kek).equals(serverKek)).toBe(true);
  });

  it('round-trips encrypt/decrypt', () => {
    const key = hkdf('some shared secret');
    const { encryptedContent, iv, authTag } = encrypt(key, 'hello world');
    const decrypted = decrypt(encryptedContent, { key, iv, authTag });
    expect(decrypted.toString('utf-8')).toBe('hello world');
  });

  it('throws when the sombra public key is missing', () => {
    expect(() => createDhEncryptionKeys(null)).toThrow('sombra public key is empty');
    expect(() => createDhEncryptionKeys('')).toThrow('sombra public key is empty');
  });

  it('produces a dhEncrypted payload the server can decrypt', () => {
    const sombra = createFakeSombra();
    const keys = createDhEncryptionKeys(sombra.publicKey);

    const dhEncrypted = createDhEncrypted(keys, 'session-secret-jwt', 'session', {
      code: 'export default async () => 1;',
      context: { userDefinedEnv: { KEY: 'value' }, allowedHosts: ['api.example.com'] },
    });

    const parsed = JSON.parse(dhEncrypted);
    expect(parsed.authMethod).toBe('session');
    expect(typeof parsed.publicKey).toBe('string');

    // Server side: derive KEK from the client's public key and decrypt
    const serverKek = sombra.deriveKek(parsed.publicKey);
    const decrypted = JSON.parse(
      decrypt(parsed.payload, {
        key: serverKek,
        iv: parsed.iv,
        authTag: parsed.authTag,
      }).toString('utf-8'),
    );
    expect(decrypted.authSecret).toBe('session-secret-jwt');
    expect(decrypted.body.code).toBe('export default async () => 1;');
    expect(decrypted.body.context.allowedHosts).toEqual(['api.example.com']);
  });

  it('decrypts a decryption context wrapped for the client keys', () => {
    const sombra = createFakeSombra();
    const keys = createDhEncryptionKeys(sombra.publicKey);

    // Server side: wrap a session secret for the client's channel
    const serverKek = sombra.deriveKek(keys.publicKey);
    const { encryptedContent, iv, authTag } = encrypt(serverKek, 'wrapped-session-secret');

    const secret = decryptDecryptionContext(
      {
        wrappedKey: encryptedContent.toString('base64'),
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
      },
      keys,
    );
    expect(secret).toBe('wrapped-session-secret');
  });
});
