import got, { type Got } from 'got';

/**
 * Creates a got client for Policy Engine REST endpoints on the monolith.
 *
 * @param transcendUrl - Transcend API base URL
 * @param auth - Transcend API key
 * @returns Configured got instance
 */
export function buildPolicyEngineClient(transcendUrl: string, auth: string): Got {
  return got.extend({
    prefixUrl: transcendUrl.replace(/\/$/, ''),
    headers: {
      Authorization: `Bearer ${auth}`,
      accept: 'application/json',
    },
  });
}
