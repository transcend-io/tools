/**
 * Wire format of a Privacy Center access token.
 *
 * `JWT` is the signed token. `SHORT` is a 43-character token for email and SMS
 * tools that limit URL length.
 */
export const PrivacyCenterAccessTokenFormat = {
  /** Signed token carrying the claims. */
  Jwt: 'JWT',
  /** 43-character token for email and SMS tools that limit URL length. */
  Short: 'SHORT',
} as const;

/** Type override */
export type PrivacyCenterAccessTokenFormat =
  (typeof PrivacyCenterAccessTokenFormat)[keyof typeof PrivacyCenterAccessTokenFormat];
