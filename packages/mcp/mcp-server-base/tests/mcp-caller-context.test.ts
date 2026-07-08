import { describe, it, expect } from 'vitest';

import { MCP_CALLER_HEADER, extractMcpCallerFromHeaders } from '../src/mcp-caller-context.js';

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
