import { TranscendMcpServer } from '@transcend-io/sdk';
import { describe, expect, it, vi } from 'vitest';

import {
  formatValidMcpServerNames,
  MCP_ALLOWLIST_DOCS,
  parseMcpServerAllowlistFromEnv,
  resolveMcpServerAllowlist,
  TRANSCEND_MCP_SERVERS_ENV,
} from '../src/mcp-server-allowlist.js';

describe('parseMcpServerAllowlistFromEnv', () => {
  it('returns undefined when the env var is unset', () => {
    vi.stubEnv(TRANSCEND_MCP_SERVERS_ENV, '');
    expect(parseMcpServerAllowlistFromEnv()).toBeUndefined();
  });

  it('parses TranscendMcpServer values and docs', () => {
    vi.stubEnv(TRANSCEND_MCP_SERVERS_ENV, 'config, consent, docs');
    const allowlist = parseMcpServerAllowlistFromEnv();
    expect(allowlist).toBeDefined();
    expect(allowlist!.has(TranscendMcpServer.Config)).toBe(true);
    expect(allowlist!.has(TranscendMcpServer.Consent)).toBe(true);
    expect(allowlist!.has(MCP_ALLOWLIST_DOCS)).toBe(true);
    expect(allowlist!.has(TranscendMcpServer.Dsr)).toBe(false);
  });

  it('rejects unknown server names with valid values in the message', () => {
    vi.stubEnv(TRANSCEND_MCP_SERVERS_ENV, 'config,not-a-server');
    expect(() => parseMcpServerAllowlistFromEnv()).toThrow(/not-a-server/);
    expect(() => parseMcpServerAllowlistFromEnv()).toThrow(formatValidMcpServerNames());
  });
});

describe('resolveMcpServerAllowlist', () => {
  it('includes every domain and docs when unset', () => {
    vi.stubEnv(TRANSCEND_MCP_SERVERS_ENV, '');
    const allowlist = resolveMcpServerAllowlist();
    for (const server of Object.values(TranscendMcpServer)) {
      expect(allowlist.has(server)).toBe(true);
    }
    expect(allowlist.has(MCP_ALLOWLIST_DOCS)).toBe(true);
  });
});
