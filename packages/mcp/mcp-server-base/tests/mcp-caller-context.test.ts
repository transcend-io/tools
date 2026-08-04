import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { describe, it, expect } from 'vitest';

import { McpClientCapability, McpHostClient } from '../src/capabilities/types.js';
import {
  MCP_CALLER_HEADER,
  extractMcpCallerFromHeaders,
  requestMcpCallerContext,
  resolveMcpCallerAttribution,
} from '../src/mcp-caller-context.js';
import { mcpSessionContext } from '../src/mcp-session-context.js';

/** Runs `read` as if serving a host, with an optional forwarded caller header. */
function asRequest(
  host: McpHostClient,
  forwarded: string | undefined,
  read: () => string | undefined,
): string | undefined {
  const session = {
    client: { capabilities: new Set<McpClientCapability>(), host },
    server: {} as Server,
  };
  return mcpSessionContext.run(session, () =>
    forwarded === undefined ? read() : requestMcpCallerContext.run(forwarded, read),
  );
}

describe('extractMcpCallerFromHeaders', () => {
  it('returns trimmed string values', () => {
    expect(
      extractMcpCallerFromHeaders({
        [MCP_CALLER_HEADER]: '  my-caller  ',
      }),
    ).toBe('my-caller');
  });

  it('returns undefined for missing or blank header', () => {
    expect(extractMcpCallerFromHeaders({})).toBeUndefined();
    expect(extractMcpCallerFromHeaders({ [MCP_CALLER_HEADER]: '' })).toBeUndefined();
    expect(extractMcpCallerFromHeaders({ [MCP_CALLER_HEADER]: '   ' })).toBeUndefined();
  });

  it('uses first non-empty entry when header is an array', () => {
    expect(
      extractMcpCallerFromHeaders({
        [MCP_CALLER_HEADER]: ['', '  zed  '],
      }),
    ).toBe('zed');
  });
});

describe('resolveMcpCallerAttribution', () => {
  it('prefers a forwarded header over the host we detected', () => {
    // A caller proxying on a user's behalf knows its own identity better than we
    // can infer it, and it is the one being billed for the traffic.
    expect(
      asRequest(McpHostClient.Claude, 'partner-integration', resolveMcpCallerAttribution),
    ).toBe('partner-integration');
  });

  it('falls back to the detected host when no header was forwarded', () => {
    // This is the whole point of the fallback: stdio has no headers, so those
    // sessions previously reached the API with no attribution at all.
    expect(asRequest(McpHostClient.Cursor, undefined, resolveMcpCallerAttribution)).toBe(
      McpHostClient.Cursor,
    );
  });

  it('sends nothing for an unrecognized host, rather than attributing traffic to "UNKNOWN"', () => {
    expect(
      asRequest(McpHostClient.Unknown, undefined, resolveMcpCallerAttribution),
    ).toBeUndefined();
  });

  it('sends nothing outside a request, so a direct handler call attributes nothing', () => {
    expect(resolveMcpCallerAttribution()).toBeUndefined();
  });
});
