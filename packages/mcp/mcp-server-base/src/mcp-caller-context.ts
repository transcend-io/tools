import { AsyncLocalStorage } from 'node:async_hooks';

import { MCP_CALLER_HEADER } from './http-header-names.js';

export { MCP_CALLER_HEADER };

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
