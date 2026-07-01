/** Strips trailing slashes from an OAuth issuer URL. */
export function normalizeIssuer(issuer: string): string {
  return issuer.replace(/\/+$/, '');
}
