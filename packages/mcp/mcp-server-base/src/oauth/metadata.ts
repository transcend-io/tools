import { normalizeIssuer } from './normalize-issuer.js';
import type { AuthorizationServerMetadata } from './types.js';

/**
 * Fetches OAuth 2.0 Authorization Server Metadata (RFC 8414) for the given issuer.
 */
export async function fetchAuthorizationServerMetadata(
  issuer: string,
): Promise<AuthorizationServerMetadata> {
  const base = normalizeIssuer(issuer);
  const url = `${base}/.well-known/oauth-authorization-server`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch OAuth authorization server metadata from ${url}: HTTP ${response.status}`,
    );
  }

  const body = (await response.json()) as Record<string, unknown>;

  const authorizationEndpoint = body.authorization_endpoint;
  const tokenEndpoint = body.token_endpoint;

  if (typeof authorizationEndpoint !== 'string') {
    throw new Error(`OAuth metadata at ${url} is missing authorization_endpoint`);
  }
  if (typeof tokenEndpoint !== 'string') {
    throw new Error(`OAuth metadata at ${url} is missing token_endpoint`);
  }

  const codeChallengeMethods = body.code_challenge_methods_supported;
  const codeChallengeMethodsSupported = Array.isArray(codeChallengeMethods)
    ? codeChallengeMethods.filter((v): v is string => typeof v === 'string')
    : [];

  if (!codeChallengeMethodsSupported.includes('S256')) {
    throw new Error(`OAuth metadata at ${url} does not support PKCE S256`);
  }

  return {
    issuer: typeof body.issuer === 'string' ? body.issuer : base,
    authorizationEndpoint,
    tokenEndpoint,
    codeChallengeMethodsSupported,
  };
}
