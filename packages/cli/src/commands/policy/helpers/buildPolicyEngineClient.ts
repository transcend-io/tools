import got, { type Got } from 'got';

/**
 * Creates a got client for Policy Engine REST endpoints on the monolith.
 *
 * The CLI appends `v1/...` paths to this base URL, so callers must NOT include
 * a trailing `/v1` (that would produce `/v1/v1/...` and an opaque `400`). We
 * detect and reject that mistake with a clear hint.
 *
 * @param transcendUrl - Transcend API base URL (without `/v1`)
 * @param auth - Transcend API key
 * @returns Configured got instance
 */
export function buildPolicyEngineClient(transcendUrl: string, auth: string): Got {
  const normalized = transcendUrl.replace(/\/$/, '');
  if (/(^|\/)v1$/i.test(normalized)) {
    throw new Error(
      `--transcend-url must not include a trailing "/v1" (the CLI appends it automatically). ` +
        `Got "${transcendUrl}"; use "${normalized.replace(/\/v1$/i, '')}" instead.`,
    );
  }
  return got.extend({
    prefixUrl: normalized,
    headers: {
      Authorization: `Bearer ${auth}`,
      accept: 'application/json',
    },
  });
}
