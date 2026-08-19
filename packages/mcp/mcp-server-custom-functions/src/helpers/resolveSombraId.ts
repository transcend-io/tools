import type { TranscendRestClient } from '@transcend-io/mcp-server-base';

import type { SombraSummary } from '../graphql.js';

/**
 * Strip trailing slashes so configured `SOMBRA_URL` matches GraphQL `customerUrl`.
 *
 * @param url - Sombra customer-ingress URL
 * @returns Normalized URL
 */
export function normalizeSombraUrl(url: string): string {
  return url.trim().replace(/\/+$/, '').toLowerCase();
}

/**
 * Best-effort configured Sombra customer-ingress URL from the REST client or env.
 *
 * @param rest - Sombra REST client used by Custom Functions tools
 * @returns Normalized URL when one is configured
 */
export function getConfiguredSombraUrl(rest: TranscendRestClient): string | undefined {
  const fromClient = typeof rest.getBaseUrl === 'function' ? rest.getBaseUrl() : '';
  const fromEnv = process.env.SOMBRA_URL?.trim() ?? '';
  const configured = fromClient || fromEnv;
  return configured ? normalizeSombraUrl(configured) : undefined;
}

/**
 * Pick the Sombra gateway a new Custom Function should run on.
 *
 * Prefers a gateway whose `customerUrl` matches the configured `SOMBRA_URL`, then
 * a unique primary gateway, then the only gateway in the org. Throws with the
 * available IDs when the agent must choose.
 *
 * @param sombras - Gateways from the `sombras` query
 * @param configuredSombraUrl - Normalized `SOMBRA_URL` when set
 * @returns Sombra gateway ID
 */
export function pickSombraId(sombras: SombraSummary[], configuredSombraUrl?: string): string {
  if (sombras.length === 0) {
    throw new Error(
      'No Sombra gateways found. Pass sombraId from custom_functions_list, or configure SOMBRA_URL.',
    );
  }

  if (configuredSombraUrl) {
    const match = sombras.find(
      (sombra) => normalizeSombraUrl(sombra.customerUrl) === configuredSombraUrl,
    );
    if (match) {
      return match.id;
    }
  }

  const primaries = sombras.filter((sombra) => sombra.isPrimarySombra);
  if (primaries.length === 1 && primaries[0]) {
    return primaries[0].id;
  }
  if (sombras.length === 1 && sombras[0]) {
    return sombras[0].id;
  }

  const choices = sombras
    .map(
      (sombra) =>
        `${sombra.id} (${sombra.title ?? 'Untitled'}${sombra.isPrimarySombra ? ', primary' : ''}; ${sombra.customerUrl})`,
    )
    .join(', ');
  throw new Error(
    'sombraId is required when this organization has multiple Sombra gateways. ' +
      `Available Sombra gateways: ${choices}.`,
  );
}

/**
 * Resolve a Sombra gateway ID for create/test-run when the caller omitted one.
 *
 * @param listSombras - Loads configured gateways
 * @param rest - Sombra REST client (for SOMBRA_URL matching)
 * @param sombraId - Explicit gateway ID from the tool call
 * @returns Sombra gateway ID
 */
export async function resolveSombraIdForCreate(
  listSombras: () => Promise<SombraSummary[]>,
  rest: TranscendRestClient,
  sombraId?: string,
): Promise<string> {
  if (sombraId) {
    return sombraId;
  }
  return pickSombraId(await listSombras(), getConfiguredSombraUrl(rest));
}
