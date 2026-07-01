import type { OAuthCallbackResult } from './types.js';

export interface ParsedOAuthCallbackQuery {
  /** Authorization code from the redirect */
  code?: string;
  /** State parameter echoed by the authorization server */
  state?: string;
  /** OAuth error code when authorization was denied */
  error?: string;
  /** Human-readable OAuth error description */
  errorDescription?: string;
}

/**
 * Parses OAuth redirect query parameters from a callback URL path and search string.
 */
export function parseOAuthCallbackQuery(url: string): ParsedOAuthCallbackQuery {
  const requestUrl = new URL(url, 'http://127.0.0.1');
  return {
    code: requestUrl.searchParams.get('code') ?? undefined,
    state: requestUrl.searchParams.get('state') ?? undefined,
    error: requestUrl.searchParams.get('error') ?? undefined,
    errorDescription: requestUrl.searchParams.get('error_description') ?? undefined,
  };
}

/**
 * Validates parsed callback query parameters and returns the authorization code result.
 */
export function validateOAuthCallbackQuery(
  query: ParsedOAuthCallbackQuery,
  expectedState: string,
): OAuthCallbackResult {
  if (query.error) {
    throw new OAuthCallbackError(
      `OAuth authorization failed: ${query.error}${query.errorDescription ? ` — ${query.errorDescription}` : ''}`,
    );
  }

  if (!query.code) {
    throw new OAuthCallbackError('OAuth callback is missing authorization code');
  }

  if (!query.state || query.state !== expectedState) {
    throw new OAuthCallbackError('OAuth callback state mismatch');
  }

  return { code: query.code, state: query.state };
}

/** Error raised when the OAuth browser redirect is invalid or denied. */
export class OAuthCallbackError extends Error {
  /** Discriminant for OAuth callback failures */
  readonly name = 'OAuthCallbackError';

  constructor(message: string) {
    super(message);
  }
}
