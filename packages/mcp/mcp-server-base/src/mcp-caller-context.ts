import { AsyncLocalStorage } from 'node:async_hooks';

import {
  MCP_CALLER_HEADER,
  MCP_CLIENT_NAME_HEADER,
  MCP_VERSION_HEADER,
} from './http-header-names.js';
import { getMcpSession } from './mcp-session-context.js';

export { MCP_CALLER_HEADER, MCP_CLIENT_NAME_HEADER, MCP_VERSION_HEADER };
export { resolveMcpPackageVersion } from './mcp-package-version.js';

/**
 * Cap on inferred labels from raw `clientInfo.name`, so a pathological host
 * string cannot blow out dashboard cardinality.
 */
const MAX_INFERRED_CALLER_LENGTH = 64;

/**
 * Per-request MCP caller label from {@link MCP_CALLER_HEADER}. Populated for HTTP
 * transport so outbound Transcend API calls can attribute traffic to the client.
 */
export const requestMcpCallerContext = new AsyncLocalStorage<string>();

/**
 * Returns the forwarded MCP caller value for the current async execution context,
 * or `undefined` when the inbound request omitted the header (e.g. stdio transport).
 */
export function getRequestMcpCaller(): string | undefined {
  return requestMcpCallerContext.getStore();
}

/**
 * Normalizes a raw `clientInfo.name` into a header-safe discovery label.
 *
 * The value is client-controlled and only ever used for attribution, never for
 * a trust decision. Restricted to an ASCII allowlist because a header value is
 * converted to a ByteString on the way out, so any code point above 255 would
 * throw and fail the request outright.
 *
 * @param raw - `clientInfo.name` from the `initialize` handshake
 * @returns A bounded ASCII label, or `undefined` when nothing usable remains
 */
export function sanitizeMcpClientName(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined;
  const normalized = raw
    .trim()
    .toLowerCase()
    // Drop anything outside [a-z0-9._-] (spaces, punctuation, non-ASCII) to a
    // single dash so the value is a ByteString-safe header label.
    .replace(/[^a-z0-9._-]+/g, '-')
    .slice(0, MAX_INFERRED_CALLER_LENGTH)
    // Trim leading/trailing dashes left by the replace or by truncating mid-run.
    .replace(/^-+|-+$/g, '');
  return normalized === '' ? undefined : normalized;
}

/**
 * Value to send as {@link MCP_CALLER_HEADER} on outbound Transcend requests.
 *
 * An explicitly forwarded header always wins, since a caller proxying on a
 * user's behalf knows its own identity better than we can infer it. Otherwise
 * falls back to the session's `McpHostClient` value from `initialize`,
 * including `unknown` so unrecognized traffic is an honest slice rather than a
 * missing tag.
 */
export function resolveMcpCallerAttribution(): string | undefined {
  const forwarded = getRequestMcpCaller();
  if (forwarded) return forwarded;

  return getMcpSession()?.client.host;
}

/**
 * Value to send as {@link MCP_CLIENT_NAME_HEADER} on outbound Transcend requests.
 *
 * Orthogonal to {@link resolveMcpCallerAttribution}: always the sanitized
 * `clientInfo.name` when present, so a forwarded caller header does not hide
 * the underlying host name used for discovery.
 */
export function resolveMcpClientName(): string | undefined {
  return sanitizeMcpClientName(getMcpSession()?.client.clientInfo?.name);
}

/** Normalizes Node / Express header values to a list of strings (drops non-string entries). */
function headerValuesAsStrings(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  if (typeof value === 'string') return [value];
  if (!Array.isArray(value)) return [];
  return value.filter((part): part is string => typeof part === 'string');
}

/**
 * Reads {@link MCP_CALLER_HEADER} from inbound HTTP headers.
 *
 * @param headers - Express / Node request headers
 */
export function extractMcpCallerFromHeaders(
  headers: Record<string, string | string[] | undefined>,
): string | undefined {
  for (const part of headerValuesAsStrings(headers[MCP_CALLER_HEADER])) {
    const trimmed = part.trim();
    if (trimmed !== '') return trimmed;
  }
  return undefined;
}
