import { createHash } from 'node:crypto';

import type { NextFunction, Request, RequestHandler, Response } from 'express';

import type { OAuthTokenAuth } from '../auth.js';
import {
  TokenVerificationStatus,
  type AccessTokenVerifier,
  type VerifiedAccessToken,
} from './introspection-token-verifier.js';

/** What the public endpoint knows about a request once its access token is verified. */
export interface VerifiedRequest {
  /** Credentials forwarded to the Transcend API for this request */
  auth: OAuthTokenAuth;
  /** Facts the authorization server returned about the token */
  token: VerifiedAccessToken;
  /** Identity that owns any MCP session this request opens. See {@link sessionOwnerOf}. */
  sessionOwner: string;
}

const VERIFIED_REQUEST_LOCAL = 'verifiedRequest';

/**
 * Returns the verified request recorded by {@link requireVerifiedBearerToken}.
 * Only call it on routes behind that middleware.
 */
export function getVerifiedRequest(res: Response): VerifiedRequest {
  return res.locals[VERIFIED_REQUEST_LOCAL] as VerifiedRequest;
}

/**
 * Names the caller that an MCP session is bound to.
 *
 * With a `sub`, the owner is the user on that OAuth client, so the session survives a
 * token refresh. Without one, the owner is the exact token: a client ID alone is shared
 * by every user of that OAuth client and cannot tell them apart.
 */
function sessionOwnerOf(accessToken: string, token: VerifiedAccessToken): string {
  return token.subject === undefined
    ? JSON.stringify({ tokenSha256: createHash('sha256').update(accessToken).digest('hex') })
    : JSON.stringify({ clientId: token.clientId ?? null, subject: token.subject });
}

function extractBearerToken(authorization: string | undefined): string | undefined {
  return /^Bearer +(\S+)$/i.exec(authorization ?? '')?.[1];
}

/**
 * Express middleware for the public endpoint. It admits a request only when its
 * `Authorization: Bearer` token is verified, and ignores every other credential.
 *
 * - No Bearer token: `401` with a `WWW-Authenticate` challenge, so the host starts a login.
 * - Refused token: the same `401` plus `error="invalid_token"`, so the host refreshes.
 * - Authorization server unreachable: `503`. The request is never let through.
 */
export function requireVerifiedBearerToken({
  verifyAccessToken,
  resourceMetadataUrl,
}: {
  /** Checks the Bearer token of each request */
  verifyAccessToken: AccessTokenVerifier;
  /** Protected resource metadata URL named in the `WWW-Authenticate` challenge */
  resourceMetadataUrl: string;
}): RequestHandler {
  const resourceMetadata = `resource_metadata="${resourceMetadataUrl}"`;

  return async (req: Request, res: Response, next: NextFunction) => {
    // A CORS preflight carries no credentials by design.
    if (req.method === 'OPTIONS') {
      next();
      return;
    }

    const accessToken = extractBearerToken(req.headers.authorization);
    if (!accessToken) {
      res
        .status(401)
        .set('WWW-Authenticate', `Bearer ${resourceMetadata}`)
        .json({
          jsonrpc: '2.0',
          error: { code: -32001, message: 'Unauthorized: authentication required' },
          id: null,
        });
      return;
    }

    const verification = await verifyAccessToken(accessToken);
    if (verification.status === TokenVerificationStatus.Unavailable) {
      res.status(503).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Access token verification is temporarily unavailable' },
        id: null,
      });
      return;
    }
    if (verification.status !== TokenVerificationStatus.Valid) {
      res
        .status(401)
        .set(
          'WWW-Authenticate',
          'Bearer error="invalid_token", ' +
            'error_description="The access token is expired, revoked, or not issued for this server", ' +
            resourceMetadata,
        )
        .json({
          jsonrpc: '2.0',
          error: { code: -32001, message: 'Unauthorized: the access token is not valid' },
          id: null,
        });
      return;
    }

    const { token } = verification;
    const verifiedRequest: VerifiedRequest = {
      auth: { type: 'oauthToken', accessToken, expiresAt: token.expiresAt },
      token,
      sessionOwner: sessionOwnerOf(accessToken, token),
    };
    res.locals[VERIFIED_REQUEST_LOCAL] = verifiedRequest;
    next();
  };
}
