import { authHeaders, type AuthCredentials } from '@transcend-io/mcp-server-base';
import got, { type Got } from 'got';

/**
 * Creates a got client for Policy Engine REST endpoints on the monolith.
 *
 * Mirrors {@link buildPolicyEngineClient} from `@transcend-io/cli` policy commands.
 *
 * @param transcendUrl - Transcend API base URL (without `/v1`)
 * @param auth - MCP auth credentials (API key, OAuth token, or session cookie)
 * @returns Configured got instance
 */
export function buildPolicyEngineClient(transcendUrl: string, auth: AuthCredentials): Got {
  const normalized = transcendUrl.replace(/\/$/, '');
  if (/(^|\/)v1$/i.test(normalized)) {
    throw new Error(
      `Transcend API URL must not include a trailing "/v1" (paths append it automatically). ` +
        `Got "${transcendUrl}"; use "${normalized.replace(/\/v1$/i, '')}" instead.`,
    );
  }
  return got.extend({
    prefixUrl: normalized,
    headers: {
      ...authHeaders(auth),
      accept: 'application/json',
    },
  });
}
