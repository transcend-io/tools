import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { Implementation } from '@modelcontextprotocol/sdk/types.js';
import { describe, it, expect } from 'vitest';

import { McpClientCapability, McpHostClient } from '../src/capabilities/types.js';
import {
  MCP_CALLER_HEADER,
  extractMcpCallerFromHeaders,
  requestMcpCallerContext,
  resolveMcpCallerAttribution,
  resolveMcpClientName,
  sanitizeMcpClientName,
} from '../src/mcp-caller-context.js';
import { mcpSessionContext } from '../src/mcp-session-context.js';

/** Every canonical host value that may appear on the inferred caller path. */
const MCP_HOST_CLIENT_VALUES = new Set<string>(Object.values(McpHostClient));

/** Runs `read` as if serving a host, with an optional forwarded caller header. */
function asRequest(
  host: McpHostClient,
  forwarded: string | undefined,
  read: () => string | undefined,
  clientInfo?: Implementation,
): string | undefined {
  const session = {
    client: {
      capabilities: new Set<McpClientCapability>(),
      host,
      ...(clientInfo && { clientInfo }),
    },
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

describe('sanitizeMcpClientName', () => {
  it('lowercases and collapses non-allowlisted runs to a single dash', () => {
    expect(sanitizeMcpClientName('  Visual Studio Code  ')).toBe('visual-studio-code');
  });

  it('strips non-ASCII code points so headers stay ByteString-safe', () => {
    // Code points above 255 would throw when fetch converts the header to a
    // ByteString; the allowlist drops them before that can happen.
    expect(sanitizeMcpClientName('caféhost')).toBe('caf-host');
    expect(sanitizeMcpClientName('主机')).toBeUndefined();
  });

  it('strips control characters', () => {
    expect(sanitizeMcpClientName('bad\u0000name\n')).toBe('bad-name');
  });

  it('returns undefined when nothing usable remains', () => {
    expect(sanitizeMcpClientName(undefined)).toBeUndefined();
    expect(sanitizeMcpClientName('')).toBeUndefined();
    expect(sanitizeMcpClientName('   ')).toBeUndefined();
    expect(sanitizeMcpClientName('!!!')).toBeUndefined();
    expect(sanitizeMcpClientName('---')).toBeUndefined();
  });

  it('truncates pathological names without leaving a trailing dash from the cut', () => {
    expect(sanitizeMcpClientName(`${'a'.repeat(63)}-extra`)).toBe('a'.repeat(63));
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
    expect(asRequest(McpHostClient.Cursor, undefined, resolveMcpCallerAttribution)).toBe(
      McpHostClient.Cursor,
    );
  });

  it('emits unknown for unrecognized hosts, rather than omitting the tag', () => {
    // An honest denominator for the dashboard: unknown traffic is a slice, not N/A.
    expect(asRequest(McpHostClient.Unknown, undefined, resolveMcpCallerAttribution)).toBe(
      McpHostClient.Unknown,
    );
  });

  it('returns an McpHostClient member on every non-forwarded path', () => {
    for (const host of Object.values(McpHostClient)) {
      const value = asRequest(host, undefined, resolveMcpCallerAttribution, {
        name: 'Some New Host',
        version: '1.0.0',
      });
      expect(value).toBe(host);
      expect(MCP_HOST_CLIENT_VALUES.has(value!)).toBe(true);
    }
  });

  it('sends nothing outside a request, so a direct handler call attributes nothing', () => {
    expect(resolveMcpCallerAttribution()).toBeUndefined();
  });
});

describe('resolveMcpClientName', () => {
  it('returns a sanitized clientInfo.name independent of caller attribution', () => {
    // A forwarded caller header must not hide the underlying host name used for
    // discovery — the two fields are orthogonal on purpose.
    expect(
      asRequest(McpHostClient.Claude, 'partner-integration', resolveMcpClientName, {
        name: 'claude-ai',
        version: '1.2.3',
      }),
    ).toBe('claude-ai');
  });

  it('surfaces unrecognized host names for discovery', () => {
    expect(
      asRequest(McpHostClient.Unknown, undefined, resolveMcpClientName, {
        name: 'Some New Host',
        version: '1.0.0',
      }),
    ).toBe('some-new-host');
  });

  it('returns undefined when clientInfo.name is absent', () => {
    expect(asRequest(McpHostClient.Cursor, undefined, resolveMcpClientName)).toBeUndefined();
  });

  it('returns undefined outside a request', () => {
    expect(resolveMcpClientName()).toBeUndefined();
  });
});
