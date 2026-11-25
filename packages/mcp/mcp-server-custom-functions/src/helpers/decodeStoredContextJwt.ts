/**
 * Decoded fields from a signed custom-function context JWT payload (no verify).
 */
export interface StoredContextJwtPayload {
  /** Encrypted secret env map (ciphertext values) */
  userDefinedEncryptedEnv?: Record<string, string>;
  /**
   * Plaintext env map. When this field is present (even `{}`), the context uses
   * split secret/plain classification.
   */
  userDefinedPlaintextEnv?: Record<string, string>;
  /** Network allowlist stored on the context */
  allowedHosts?: string[];
  /** Whether third-party imports are allowed */
  allowThirdPartyImports?: boolean;
  /** Execution timeout in milliseconds */
  timeoutMs?: number;
}

/**
 * Decode the payload of a signed context JWT without verifying the signature.
 *
 * @param signedCodeContextJwt - Signed context JWT from GraphQL
 * @returns Parsed payload, or undefined when malformed
 */
export function decodeStoredContextJwt(
  signedCodeContextJwt: string,
): StoredContextJwtPayload | undefined {
  const segment = signedCodeContextJwt.split('.')[1];
  if (!segment) {
    return undefined;
  }
  try {
    const json = Buffer.from(segment, 'base64url').toString('utf8');
    return JSON.parse(json) as StoredContextJwtPayload;
  } catch {
    return undefined;
  }
}
