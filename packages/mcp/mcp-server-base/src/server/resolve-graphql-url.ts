import type { Logger } from '../clients/graphql/base.js';
import { DEFAULT_TRANSCEND_API_URL } from '../defaults.js';
import { getResolvedTranscendApiUrl, isOAuthModeEnabled } from '../oauth/config.js';
import { isTestEnv, resolveTestOverride } from '../oauth/env.js';
import { ensureOAuthStartupReady } from '../oauth/startup.js';

/** Environment variable for the Transcend GraphQL backend API URL. */
const TRANSCEND_API_URL_ENV = 'TRANSCEND_API_URL';

/**
 * Resolves the GraphQL backend URL for MCP server startup.
 *
 * OAuth stdio mode verifies regional client credentials and uses the matching
 * issuer host. API-key and HTTP session modes honor {@link TRANSCEND_API_URL}.
 */
export async function resolveMcpGraphqlUrl(logger: Logger): Promise<string> {
  if (isOAuthModeEnabled()) {
    await ensureOAuthStartupReady(logger);
    return getResolvedTranscendApiUrl();
  }

  if (isTestEnv()) {
    return resolveTestOverride(TRANSCEND_API_URL_ENV, DEFAULT_TRANSCEND_API_URL);
  }

  const configuredUrl = process.env[TRANSCEND_API_URL_ENV]?.trim();
  return configuredUrl || DEFAULT_TRANSCEND_API_URL;
}
