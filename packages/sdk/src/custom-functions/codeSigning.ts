/**
 * The execution context for a custom function's code.
 */
export interface CustomFunctionCodeContextInput {
  /** Environment variables made available to the function (values are encrypted at sign time) */
  userDefinedEnv: Record<string, string>;
  /** Hosts the function is allowed to make network requests to */
  allowedHosts: string[];
  /** Whether the function may import third party modules */
  allowThirdPartyImports?: boolean;
  /** Execution timeout in milliseconds (capped by the Sombra gateway configuration) */
  timeoutMs?: number;
}

/**
 * The plaintext payload sent to the Sombra customer-ingress
 * `/v1/custom/sign` endpoint.
 */
export interface CustomFunctionSignPayload {
  /** The plaintext TypeScript source code of the custom function */
  code: string;
  /** The execution context for the code */
  context: CustomFunctionCodeContextInput;
}

/**
 * Decode the payload of a JWT without verifying its signature.
 *
 * Custom function code and context JWTs are HMAC-signed by Sombra but their
 * payloads are readable base64url JSON. Since the JWTs are fetched over the
 * authenticated GraphQL API, decoding without verification is safe for the
 * purposes of change detection.
 *
 * @param jwt - The JWT string
 * @returns The decoded payload object, or undefined if the JWT is malformed
 */
export function decodeJwtPayload<T extends object>(jwt: string): T | undefined {
  const segments = jwt.split('.');
  if (segments.length !== 3 || !segments[1]) {
    return undefined;
  }
  try {
    return JSON.parse(Buffer.from(segments[1], 'base64url').toString('utf-8')) as T;
  } catch {
    return undefined;
  }
}

/**
 * The decoded payload of a signed custom function code JWT.
 */
export interface SignedCustomFunctionCode {
  /** The base64-encoded source code */
  base64Code: string;
}

/**
 * The decoded payload of a signed custom function code context JWT. The
 * environment variable values are encrypted at sign time, so only their names
 * are comparable.
 */
export interface SignedCustomFunctionCodeContext {
  /** Hosts the function is allowed to make network requests to */
  allowedHosts?: string[];
  /** Whether the function may import third party modules */
  allowThirdPartyImports?: boolean;
  /** Execution timeout in milliseconds */
  timeoutMs?: number;
  /** Environment variables, with values encrypted by the Sombra gateway */
  userDefinedEncryptedEnv?: Record<string, unknown>;
}

/**
 * The result of comparing a local custom function definition against the
 * signed code and context currently stored in Transcend.
 */
export interface CustomFunctionDiff {
  /** Whether any comparable field differs */
  changed: boolean;
  /** Human-readable list of fields that differ */
  changedFields: string[];
}

/**
 * Compare a desired sign payload against the signed code/context JWTs of an
 * existing custom function version.
 *
 * Environment variable *values* are encrypted server-side and cannot be
 * compared — only their names are diffed. Callers should offer a force flag to
 * re-push when only env values change.
 *
 * @param desired - The desired code and context
 * @param existing - The existing signed JWTs from the API
 * @returns The diff result
 */
export function diffCustomFunctionCode(
  desired: CustomFunctionSignPayload,
  existing: {
    /** The signed code JWT of the existing version */
    signedCodeJwt: string;
    /** The signed code context JWT of the existing version */
    signedCodeContextJwt: string;
  },
): CustomFunctionDiff {
  const changedFields: string[] = [];

  const codePayload = decodeJwtPayload<SignedCustomFunctionCode>(existing.signedCodeJwt);
  const existingCode =
    codePayload === undefined
      ? undefined
      : Buffer.from(codePayload.base64Code, 'base64').toString('utf-8');
  if (existingCode !== desired.code) {
    changedFields.push('code');
  }

  const contextPayload = decodeJwtPayload<SignedCustomFunctionCodeContext>(
    existing.signedCodeContextJwt,
  );
  const existingHosts = [...(contextPayload?.allowedHosts ?? [])].sort();
  const desiredHosts = [...desired.context.allowedHosts].sort();
  if (JSON.stringify(existingHosts) !== JSON.stringify(desiredHosts)) {
    changedFields.push('allowedHosts');
  }
  if (
    (contextPayload?.allowThirdPartyImports ?? false) !==
    (desired.context.allowThirdPartyImports ?? false)
  ) {
    changedFields.push('allowThirdPartyImports');
  }
  if (contextPayload?.timeoutMs !== desired.context.timeoutMs) {
    changedFields.push('timeoutMs');
  }
  const existingEnvNames = Object.keys(contextPayload?.userDefinedEncryptedEnv ?? {}).sort();
  const desiredEnvNames = Object.keys(desired.context.userDefinedEnv).sort();
  if (JSON.stringify(existingEnvNames) !== JSON.stringify(desiredEnvNames)) {
    changedFields.push('env');
  }

  return { changed: changedFields.length > 0, changedFields };
}
