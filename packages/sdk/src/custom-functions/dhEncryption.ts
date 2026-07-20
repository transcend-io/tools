import { createCipheriv, createDecipheriv, createECDH, createHmac, randomBytes } from 'node:crypto';

/**
 * The elliptic curve used for the Diffie-Hellman key exchange with Sombra.
 */
export const SOMBRA_ECDH_CURVE = 'secp384r1';

/**
 * The content encryption algorithm used on the Diffie-Hellman channel.
 */
export const SOMBRA_CONTENT_ENCRYPTION_ALGORITHM = 'aes-256-gcm';

/**
 * 96-bit random initialization vector (96-bit random IVs for GCM mode).
 */
export const SOMBRA_IV_RANDOMNESS = 12;

/**
 * Diffie-Hellman encryption keys for a channel with Sombra.
 */
export interface DhEncryptionKeys {
  /** The local DH public key, base64 & uncompressed */
  publicKey: string;
  /** The public key of the Sombra gateway used to create the shared secret */
  sombraPublicKey: string;
  /** The encryption key derived from the shared secret (base64) */
  kek: string;
}

/**
 * The decryption context returned by Sombra session endpoints. Contains a
 * secret wrapped for the client's ephemeral Diffie-Hellman public key.
 */
export interface DecryptionContext {
  /** The wrapped (encrypted) secret, base64 */
  wrappedKey: string;
  /** The AES-GCM auth tag, base64 */
  authTag: string;
  /** The AES-GCM initialization vector, base64 */
  iv: string;
}

/**
 * Convert string or buffer to buffer
 *
 * @param input - A base64 string or buffer
 * @param encoding - The buffer encoding
 * @returns A buffer
 */
export function toBuffer(input: string | Buffer, encoding: BufferEncoding = 'base64'): Buffer {
  return typeof input === 'string' ? Buffer.from(input, encoding) : input;
}

/**
 * Creates a cryptographically secure key from arbitrary inputs.
 *
 * Must stay byte-compatible with the HKDF implementation Sombra's clients use
 * (HMAC-SHA256 keyed with a 256-byte zero buffer).
 *
 * @param inputs - Strings or buffers to concatenate and process
 * @returns Cryptographically secure buffer to be used as an encryption key
 */
export function hkdf(...inputs: (string | Buffer)[]): Buffer {
  const ikm = inputs
    .map((input) => (Buffer.isBuffer(input) ? input : Buffer.from(input)))
    .reduce((acc, cur) => Buffer.concat([acc, cur]));

  const iv = Buffer.alloc(256);
  const hmac = createHmac('sha256', iv);
  hmac.update(ikm);
  return hmac.digest();
}

/**
 * Create a new set of Diffie-Hellman encryption keys for a channel with a
 * Sombra gateway.
 *
 * @param sombraPublicKey - The ECDH public key of the Sombra gateway (base64)
 * @returns A newly generated set of Diffie-Hellman encryption keys
 */
export function createDhEncryptionKeys(
  sombraPublicKey: string | null | undefined,
): DhEncryptionKeys {
  if (!sombraPublicKey) {
    throw new Error(
      `Cannot create DH encryption keys, sombra public key is empty: ${JSON.stringify(sombraPublicKey)}`,
    );
  }
  const ecdh = createECDH(SOMBRA_ECDH_CURVE);
  const publicKey = ecdh.generateKeys('base64', 'uncompressed');
  const secret = ecdh.computeSecret(sombraPublicKey, 'base64');
  return {
    publicKey,
    sombraPublicKey,
    kek: hkdf(secret).toString('base64'),
  };
}

/**
 * The result of encrypting content on the Diffie-Hellman channel.
 */
export interface EncryptionContext {
  /** The encrypted content */
  encryptedContent: Buffer;
  /** The initialization vector for the encryption */
  iv: Buffer;
  /** The auth tag generated for the encryption */
  authTag: Buffer;
}

/**
 * Encrypt content with an AES-256-GCM key.
 *
 * @param key - The encryption key with which to encrypt the data (base64 string or buffer)
 * @param content - The content to encrypt
 * @returns The encrypted data
 */
export function encrypt(key: Buffer | string, content: Buffer | string): EncryptionContext {
  const iv = randomBytes(SOMBRA_IV_RANDOMNESS);
  const cipher = createCipheriv(SOMBRA_CONTENT_ENCRYPTION_ALGORITHM, toBuffer(key), iv);

  const encryptedContent = Buffer.concat([
    cipher.update(toBuffer(content, 'utf-8')),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return { encryptedContent, iv, authTag };
}

/**
 * Options used to decrypt encrypted data
 */
export interface DecryptOptions {
  /** The encryption key with which to decrypt the data */
  key: string | Buffer;
  /** The initialization vector */
  iv: string | Buffer;
  /** The authentication tag to validate the decryption */
  authTag: string | Buffer;
}

/**
 * Decrypt AES-256-GCM encrypted data.
 *
 * @param encryptedData - The data to decrypt (base64 string or buffer)
 * @param options - The configuration options
 * @returns The decrypted data
 */
export function decrypt(
  encryptedData: string | Buffer,
  { key, iv, authTag }: DecryptOptions,
): Buffer {
  const decipher = createDecipheriv(
    SOMBRA_CONTENT_ENCRYPTION_ALGORITHM,
    toBuffer(key),
    toBuffer(iv),
  );
  decipher.setAuthTag(toBuffer(authTag));
  return Buffer.concat([decipher.update(toBuffer(encryptedData)), decipher.final()]);
}

/**
 * Decrypt a decryption context returned by a Sombra session endpoint into the
 * plaintext secret it wraps.
 *
 * @param decryptionContext - The decryption context returned from the API
 * @param dhEncryptionKeys - The DH encryption keys the context was wrapped for
 * @returns The unwrapped secret as a UTF-8 string
 */
export function decryptDecryptionContext(
  decryptionContext: DecryptionContext,
  dhEncryptionKeys: DhEncryptionKeys,
): string {
  return decrypt(decryptionContext.wrappedKey, {
    key: toBuffer(dhEncryptionKeys.kek),
    iv: decryptionContext.iv,
    authTag: decryptionContext.authTag,
  }).toString('utf-8');
}

/**
 * Construct a `dhEncrypted` payload to send over a Diffie-Hellman channel with
 * Sombra. The payload carries the auth secret (e.g. a Sombra session secret)
 * and an arbitrary body, encrypted with the channel key.
 *
 * @param dhEncryptionKeys - The generated encryption keys
 * @param authSecret - The auth secret to encrypt and send to Sombra
 * @param authMethod - The auth strategy the secret belongs to (e.g. `session`)
 * @param body - The body content to encrypt
 * @returns The stringified dh encrypted payload
 */
export function createDhEncrypted(
  { kek, publicKey }: DhEncryptionKeys,
  authSecret: string,
  authMethod: string,
  body: object = {},
): string {
  const { encryptedContent, iv, authTag } = encrypt(kek, JSON.stringify({ authSecret, body }));

  return JSON.stringify({
    payload: encryptedContent.toString('base64'),
    iv: iv.toString('base64'),
    authMethod,
    authTag: authTag.toString('base64'),
    publicKey,
  });
}
