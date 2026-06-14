function normalizeIssuer(issuer: string): string {
  return issuer.replace(/\/+$/, '');
}

/**
 * Exchanges an OAuth client secret for a client identifier via `/oauth/client-info`.
 */
export async function fetchOAuthClientInfo(issuer: string, clientSecret: string): Promise<string> {
  const url = `${normalizeIssuer(issuer)}/oauth/client-id`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ client_secret: clientSecret }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `OAuth client-info exchange failed: HTTP ${response.status}${detail ? ` — ${detail}` : ''}`,
    );
  }

  const body = (await response.json()) as Record<string, unknown>;
  const clientId = body.client_id;
  if (typeof clientId !== 'string' || !clientId) {
    throw new Error('OAuth client-info response is missing client_id');
  }

  return clientId;
}
