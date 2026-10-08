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

/**
 * Env var key names on a stored context JWT (split or legacy).
 *
 * @param payload - Decoded context JWT payload
 * @returns Sorted unique key names
 */
export function envKeyNamesFromStoredContext(payload: StoredContextJwtPayload): string[] {
  const keys = new Set<string>();
  for (const key of Object.keys(payload.userDefinedEncryptedEnv ?? {})) {
    keys.add(key);
  }
  for (const key of Object.keys(payload.userDefinedPlaintextEnv ?? {})) {
    keys.add(key);
  }
  return [...keys].sort((left, right) => left.localeCompare(right));
}

/**
 * Whether the stored JWT uses split secret/plain env maps.
 *
 * @param payload - Decoded context JWT payload
 * @returns True when `userDefinedPlaintextEnv` is present on the JWT
 */
export function storedContextUsesSplitEnv(payload: StoredContextJwtPayload): boolean {
  return payload.userDefinedPlaintextEnv !== undefined;
}
