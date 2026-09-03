import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

/** Fallback message when a tool fails without saying why. */
const TOOL_CALL_FAILED = 'Tool call failed';

/**
 * The envelope every Transcend MCP tool returns, as produced by
 * `createToolResult`. Views receive it as JSON in the first text content block.
 */
export interface ToolEnvelope<TData> {
  /** Whether the tool call succeeded */
  success?: boolean;
  /** Result payload when successful */
  data?: TData;
  /** Human-readable error message when unsuccessful */
  error?: string;
  /** Machine-readable error code when unsuccessful */
  code?: string;
  /** Structured error details when unsuccessful */
  details?: Record<string, unknown>;
  /** Total matching rows across all pages (`createListResult`) */
  totalCount?: number;
  /** Whether another page of results exists (`createListResult`) */
  hasNextPage?: boolean;
  /** Cursor for the next page when the tool uses cursor pagination */
  nextCursor?: string;
}

/** Payload and error message extracted from a tool result. */
export interface ParsedToolResult<TData> {
  /** Result payload, or undefined when the tool reported an error */
  data: TData | undefined;
  /** Human-readable error message, or undefined when the call succeeded */
  error: string | undefined;
  /** Total matching rows across all pages, when the tool returned a list envelope */
  totalCount?: number;
  /** Whether another page of results exists, when the tool returned a list envelope */
  hasNextPage?: boolean;
  /** Cursor for the next page, when the tool returned one */
  nextCursor?: string;
}

/**
 * Reads the value a tool sent, preferring the spec's typed channel and falling
 * back to the JSON our servers currently serialize into the first text block.
 *
 * Returns `undefined` when the result carries neither.
 */
function readRawPayload(result: CallToolResult): unknown {
  if (result.structuredContent !== undefined) {
    return result.structuredContent;
  }

  const firstText = result.content?.find((block) => block.type === 'text');
  if (firstText?.type !== 'text') {
    return undefined;
  }

  try {
    return JSON.parse(firstText.text) as unknown;
  } catch {
    // A tool that returns prose rather than JSON is still worth surfacing.
    return { success: !result.isError, data: firstText.text };
  }
}

/**
 * Build a readable error string from a failed tool envelope, including code and
 * details when present so views/console logging can debug without the raw JSON.
 */
function formatEnvelopeError(envelope: ToolEnvelope<unknown>): string {
  const parts = [envelope.error?.trim() || TOOL_CALL_FAILED];
  if (envelope.code) {
    parts.push(`[${envelope.code}]`);
  }
  if (envelope.details && Object.keys(envelope.details).length > 0) {
    try {
      parts.push(JSON.stringify(envelope.details));
    } catch {
      parts.push(String(envelope.details));
    }
  }
  return parts.join(' ');
}

/**
 * Pulls the payload out of a tool result.
 *
 * The value may arrive either as a `createToolResult` envelope or as a bare
 * payload — `structuredContent` in particular is expected to carry the payload
 * directly. `createToolResult` always sets `success`, so its presence is what
 * distinguishes the two; anything else is treated as the payload itself rather
 * than silently resolving to `undefined`.
 *
 * @param result - Tool result received from a notification or a tool call
 * @returns The payload, or an error message when the call failed
 */
export function parseToolEnvelope<TData>(result: CallToolResult): ParsedToolResult<TData> {
  const raw = readRawPayload(result);

  if (raw === null || typeof raw !== 'object') {
    return { data: undefined, error: result.isError ? TOOL_CALL_FAILED : undefined };
  }

  const envelope = raw as ToolEnvelope<TData>;
  if (typeof envelope.success !== 'boolean') {
    return {
      data: result.isError ? undefined : (raw as TData),
      error: result.isError ? TOOL_CALL_FAILED : undefined,
    };
  }

  const failed = result.isError === true || envelope.success === false;
  if (failed) {
    return { data: undefined, error: formatEnvelopeError(envelope) };
  }

  return {
    data: envelope.data,
    error: undefined,
    ...listMeta(envelope),
  };
}

/** Copy list-pagination fields from a successful envelope when they are present. */
function listMeta(
  envelope: ToolEnvelope<unknown>,
): Pick<ParsedToolResult<unknown>, 'totalCount' | 'hasNextPage' | 'nextCursor'> {
  return {
    ...(typeof envelope.totalCount === 'number' ? { totalCount: envelope.totalCount } : {}),
    ...(typeof envelope.hasNextPage === 'boolean' ? { hasNextPage: envelope.hasNextPage } : {}),
    ...(typeof envelope.nextCursor === 'string' && envelope.nextCursor.length > 0
      ? { nextCursor: envelope.nextCursor }
      : {}),
  };
}
