/** OAuth 2.0 Authorization Server Metadata (RFC 8414 subset). */
export interface AuthorizationServerMetadata {
  /** Authorization server issuer identifier */
  issuer: string;
  /** Authorization endpoint URL */
  authorizationEndpoint: string;
  /** Token endpoint URL */
  tokenEndpoint: string;
  /** Dynamic client registration endpoint URL */
  registrationEndpoint: string;
  /** Supported PKCE code challenge methods */
  codeChallengeMethodsSupported: string[];
}

/** Result of dynamic client registration (RFC 7591 subset). */
export interface OAuthClientRegistration {
  /** Registered OAuth client identifier */
  clientId: string;
  /** Redirect URI registered with the client */
  redirectUri: string;
}

/** Authorization code received at the local callback server. */
export interface OAuthCallbackResult {
  /** Authorization code from the redirect */
  code: string;
  /** State parameter echoed by the authorization server */
  state: string;
}

/** PKCE verifier and challenge pair for S256. */
export interface PkcePair {
  /** High-entropy cryptographic random verifier */
  codeVerifier: string;
  /** S256 code challenge derived from the verifier */
  codeChallenge: string;
}

/** In-flight OAuth login session (phases 1–3). */
export interface PendingOAuthSession {
  /** Ephemeral localhost redirect URI used for this session */
  redirectUri: string;
  /** Registered client identifier */
  clientId: string;
  /** PKCE verifier to use during token exchange (phase 3) */
  codeVerifier: string;
  /** Promise that resolves when the user completes browser consent */
  waitForCallback: () => Promise<OAuthCallbackResult>;
  /** Shut down the callback listener */
  close: () => Promise<void>;
}
