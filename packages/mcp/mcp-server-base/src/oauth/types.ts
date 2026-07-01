/** OAuth 2.0 Authorization Server Metadata (RFC 8414 subset). */
export interface AuthorizationServerMetadata {
  /** Authorization server issuer identifier */
  issuer: string;
  /** Authorization endpoint URL */
  authorizationEndpoint: string;
  /** Token endpoint URL */
  tokenEndpoint: string;
  /** Supported PKCE code challenge methods */
  codeChallengeMethodsSupported: string[];
}

/** Authorization code received at the local callback server. */
export interface OAuthCallbackResult {
  /** Authorization code from the redirect */
  code: string;
  /** State parameter echoed by the authorization server */
  state: string;
}

/** Authorization grant context produced after a successful callback (phase 3 input). */
export interface OAuthAuthorizationGrant {
  /** Authorization code from the redirect */
  code: string;
  /** State parameter echoed by the authorization server */
  state: string;
  /** PKCE verifier used during token exchange */
  codeVerifier: string;
  /** Redirect URI registered for this login attempt */
  redirectUri: string;
  /** Configured OAuth client identifier */
  clientId: string;
}

/** PKCE verifier and challenge pair for S256. */
export interface PkcePair {
  /** High-entropy cryptographic random verifier */
  codeVerifier: string;
  /** S256 code challenge derived from the verifier */
  codeChallenge: string;
}

/** OAuth token endpoint response (RFC 6749 subset). */
export interface OAuthTokenResponse {
  /** Issued access token */
  access_token: string;
  /** Refresh token when offline_access was granted */
  refresh_token?: string;
  /** Access token lifetime in seconds */
  expires_in?: number;
  /** Token type (typically Bearer) */
  token_type?: string;
  /** Granted scope string */
  scope?: string;
}

/** Persisted OAuth tokens for a single issuer. */
export interface StoredOAuthTokens {
  /** OAuth access token */
  accessToken: string;
  /** OAuth refresh token */
  refreshToken?: string;
  /** Unix timestamp (ms) when the access token should be treated as expired */
  expiresAt: number;
  /** Granted scope string */
  scope?: string;
  /** OAuth authorization server issuer */
  issuer: string;
  /** OAuth client identifier used during login */
  clientId: string;
}

/** In-flight OAuth login session (phases 1–3). */
export interface PendingOAuthSession {
  /** Browser authorization URL opened for this login attempt */
  authorizationUrl: string;
  /** Fixed localhost redirect URI used for this session */
  redirectUri: string;
  /** Configured OAuth client identifier */
  clientId: string;
  /** PKCE verifier to use during token exchange (phase 3) */
  codeVerifier: string;
  /** Promise that resolves when the user completes browser consent */
  waitForCallback: () => Promise<OAuthCallbackResult>;
  /** Shut down the callback listener */
  close: () => Promise<void>;
}
