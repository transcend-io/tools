import { AsyncLocalStorage } from 'node:async_hooks';

import { McpHostClient } from './capabilities/types.js';
import { MCP_CALLER_HEADER } from './http-header-names.js';
import { getMcpSession } from './mcp-session-context.js';

export { MCP_CALLER_HEADER };

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
 * Normalizes a raw `clientInfo.name` into a stable attribution label.
 *
 * Known hosts still use the canonical {@link McpHostClient} value; this is only
 * for unrecognized names so dashboards can discover new hosts without sending
 * the {@link McpHostClient.Unknown} sentinel.
 */
export function sanitizeMcpCallerLabel(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined;
  const normalized = raw.trim().toLowerCase().replace(/\s+/g, '-');
  if (normalized === '' || normalized === McpHostClient.Unknown) return undefined;
  return normalized.length <= MAX_INFERRED_CALLER_LENGTH
    ? normalized
    : normalized.slice(0, MAX_INFERRED_CALLER_LENGTH);
}

/**
 * Value to send as {@link MCP_CALLER_HEADER} on outbound Transcend requests.
 *
 * An explicitly forwarded header always wins, since a caller proxying on a
 * user's behalf knows its own identity better than we can infer it. Otherwise
 * falls back to the host from the MCP `initialize` handshake: the canonical
 * {@link McpHostClient} value when recognized, or a sanitized `clientInfo.name`
 * when not. Sends nothing only when there is no session or no usable name.
 */
export function resolveMcpCallerAttribution(): string | undefined {
  const forwarded = getRequestMcpCaller();
  if (forwarded) return forwarded;

  const client = getMcpSession()?.client;
  if (!client) return undefined;

  if (client.host !== McpHostClient.Unknown) {
    return client.host;
  }

  return sanitizeMcpCallerLabel(client.clientInfo?.name);
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
