import { describe, expect, it } from 'vitest';

import {
  HOST_PATTERNS,
  HOST_QUIRKS,
  quirksFor,
  whatIsTheClient,
} from '../src/capabilities/client-detection.js';
import { McpHostClient } from '../src/capabilities/types.js';

/**
 * Names hosts have actually been observed reporting, with the host each belongs
 * to. Shared by the identification cases and the no-overlap check below.
 */
const OBSERVED_NAMES: readonly (readonly [name: string, host: McpHostClient])[] = [
  ['claude-ai', McpHostClient.Claude],
  ['claude.ai', McpHostClient.Claude],
  ['Claude Desktop', McpHostClient.Claude],
  ['claude-code', McpHostClient.ClaudeCode],
  ['local-agent-mode-abc123', McpHostClient.ClaudeCode],
  ['Cursor', McpHostClient.Cursor],
  ['cursor-vscode', McpHostClient.Cursor],
  ['Visual Studio Code', McpHostClient.VsCodeCopilot],
  ['Code - OSS Dev', McpHostClient.VsCodeCopilot],
  ['codex-mcp-client', McpHostClient.Codex],
  ['gemini-cli-mcp-client', McpHostClient.Gemini],
  // The name the official Inspector actually sends, confirmed off the wire.
  ['inspector', McpHostClient.McpInspector],
  ['mcp-inspector', McpHostClient.McpInspector],
  ['mcp-inspector-tui', McpHostClient.McpInspector],
];

describe('whatIsTheClient', () => {
  it.each(OBSERVED_NAMES)('identifies %s', (name, expected) => {
    expect(whatIsTheClient({ name, version: '1.0.0' })).toBe(expected);
  });

  it('gives every observed name exactly one host', () => {
    // What makes HOST_PATTERNS safe to key by host instead of ordering: with no
    // two hosts matching the same name, iteration order cannot change the answer.
    // An overlap would otherwise surface as attribution quietly landing on
    // whichever host happened to be declared first.
    for (const [name] of OBSERVED_NAMES) {
      const claimedBy = Object.entries(HOST_PATTERNS)
        .filter(([, patterns]) => patterns.some((pattern) => pattern.test(name.toLowerCase())))
        .map(([host]) => host);
      expect(claimedBy, `"${name}" should be claimed by exactly one host`).toHaveLength(1);
    }
  });

  it('tolerates the version and variant suffixes hosts append', () => {
    // Every pattern ends at a word boundary rather than the end of the string,
    // because a host that renames itself `cursor-2` should not become Unknown.
    expect(whatIsTheClient({ name: 'cursor-2.1', version: '1' })).toBe(McpHostClient.Cursor);
    expect(whatIsTheClient({ name: 'claude-code-cli', version: '1' })).toBe(
      McpHostClient.ClaudeCode,
    );
    // Gemini is matched by family rather than by its one observed name, so a
    // differently named Gemini surface still lands in the right bucket.
    expect(whatIsTheClient({ name: 'gemini-cli', version: '1' })).toBe(McpHostClient.Gemini);
  });

  it('does not claim a client that merely mentions a known name', () => {
    // Anchoring is the point: a fork or a proxy fronting another tool would
    // otherwise inherit that tool's identity and quietly corrupt attribution.
    for (const name of ['my-cursor-fork', 'not-claude', 'proxy-for-vscode', 'not-inspector']) {
      expect(whatIsTheClient({ name, version: '1' })).toBe(McpHostClient.Unknown);
    }
  });

  it('does not guess at an unseen Claude surface', () => {
    // Deliberately no bare `claude` catch-all: it would also match `claude-code`,
    // and resolving that overlap by declaration order is what keying this table by
    // host is meant to rule out. A new surface shows up in the handshake log, and
    // gets a pattern once its real name is known.
    expect(whatIsTheClient({ name: 'claude', version: '1' })).toBe(McpHostClient.Unknown);
    expect(whatIsTheClient({ name: 'claude-code', version: '1' })).toBe(McpHostClient.ClaudeCode);
  });

  it('returns Unknown rather than throwing for an unrecognized host', () => {
    expect(whatIsTheClient({ name: 'totally-new-agent', version: '9' })).toBe(
      McpHostClient.Unknown,
    );
  });

  it('returns Unknown when nothing is provided', () => {
    expect(whatIsTheClient()).toBe(McpHostClient.Unknown);
  });

  it('ignores blank names and falls through to the caller header', () => {
    expect(whatIsTheClient({ name: '   ', version: '1' }, 'gemini-cli')).toBe(McpHostClient.Gemini);
  });

  it('uses clientInfo in preference to the caller header', () => {
    expect(whatIsTheClient({ name: 'cursor', version: '1' }, 'claude-ai')).toBe(
      McpHostClient.Cursor,
    );
  });

  it('falls back to the caller header when clientInfo is absent', () => {
    expect(whatIsTheClient(undefined, 'cursor')).toBe(McpHostClient.Cursor);
  });
});

describe('quirksFor', () => {
  it('reports no quirks for a host without an entry', () => {
    // The registry is empty today, so this is every host. It stays meaningful as
    // entries are added: a host nobody wrote a workaround for must not inherit
    // someone else's.
    expect(HOST_QUIRKS[McpHostClient.Claude]).toBeUndefined();
    expect(quirksFor(McpHostClient.Claude)).toEqual({});
    expect(quirksFor(McpHostClient.Unknown)).toEqual({});
  });
});
