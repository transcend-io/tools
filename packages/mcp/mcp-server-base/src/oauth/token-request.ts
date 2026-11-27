import { OAUTH_TOKEN_REQUEST_TIMEOUT_MS } from './constants.js';
import type { OAuthTokenResponse } from './types.js';

/** OAuth `error` code for a refresh token or authorization code the server no longer accepts. */
export const OAUTH_INVALID_GRANT_ERROR = 'invalid_grant';

/**
 * The token endpoint answered with an error status.
 *
 * A request that never got an answer (DNS, connection reset, timeout) is not
 * this error; it surfaces as whatever `fetch` threw.
 */
export class OAuthTokenRequestError extends Error {
  /** HTTP status of the response */
  public readonly status: number;
  /** OAuth `error` code from the response body (RFC 6749 section 5.2), when there is one */
  public readonly oauthError: string | undefined;

  constructor(message: string, status: number, oauthError: string | undefined) {
    super(message);
    this.name = 'OAuthTokenRequestError';
    this.status = status;
    this.oauthError = oauthError;
  }
}

/** Longest piece of a token endpoint error body that goes into an error message. */
const MAX_ERROR_DETAIL_LENGTH = 200;

/** Single-line, length-capped error body, so a proxy HTML page cannot flood the logs. */
function summarizeErrorBody(responseBody: string): string {
  const oneLine = responseBody.replace(/\s+/g, ' ').trim();
  return oneLine.length > MAX_ERROR_DETAIL_LENGTH
    ? `${oneLine.slice(0, MAX_ERROR_DETAIL_LENGTH)}...`
    : oneLine;
}

function readOAuthErrorCode(responseBody: string): string | undefined {
  try {
    const parsed: unknown = JSON.parse(responseBody);
    if (typeof parsed !== 'object' || parsed === null || !('error' in parsed)) return undefined;
    return typeof parsed.error === 'string' ? parsed.error : undefined;
  } catch (error) {
    if (error instanceof SyntaxError) return undefined;
    throw error;
  }
}

/**
 * Posts a form-encoded request to the OAuth token endpoint.
 *
 * @throws OAuthTokenRequestError when the endpoint answers with an error status
 */
export async function postOAuthTokenRequest(
  tokenEndpoint: string,
  body: URLSearchParams,
  errorPrefix = 'OAuth token request failed',
  fetchImpl: typeof fetch = fetch,
): Promise<OAuthTokenResponse> {
  const response = await fetchImpl(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
    signal: AbortSignal.timeout(OAUTH_TOKEN_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    const summary = summarizeErrorBody(detail);
    throw new OAuthTokenRequestError(
      `${errorPrefix}: HTTP ${response.status}${summary ? ` — ${summary}` : ''}`,
      response.status,
      readOAuthErrorCode(detail),
    );
  }

  const tokenResponse = (await response.json()) as OAuthTokenResponse;
  if (typeof tokenResponse.access_token !== 'string' || !tokenResponse.access_token) {
    throw new Error(`${errorPrefix}: response is missing access_token`);
  }

  return tokenResponse;
}
