import type { Implementation } from '@modelcontextprotocol/sdk/types.js';

import { McpHostClient } from './types.js';

/** Every host except the one that means "we could not tell". */
export type DetectableHost = Exclude<McpHostClient, McpHostClient.Unknown>;

/**
 * Names each host is known to report, tested against the normalized identifier.
 *
 * Patterns are anchored at the start, so a client that merely mentions a known
 * slug cannot borrow that host's identity; the trailing `\b` still allows the
 * version and variant suffixes hosts append. No two hosts may match the same
 * name, which is what lets this be keyed by host rather than ordered — with no
 * overlap, iteration order cannot change the answer, and
 * `client-detection.test.ts` enforces it.
 */
export const HOST_PATTERNS: Readonly<Record<DetectableHost, readonly RegExp[]>> = {
  // Desktop and web both send `claude-ai`, never `claude-desktop`, reported from
  // RPC logs on both surfaces:
  // https://github.com/anthropics/claude-ai-mcp/issues/61#issuecomment-4285045628
  // The other two are for forwarded caller headers, which partners write by hand.
  [McpHostClient.Claude]: [/^claude-ai\b/, /^claude\.ai\b/, /^claude desktop\b/],
  // `claude-code` from the CLI, `local-agent-mode-*` from the desktop app, per
  // that same comment.
  [McpHostClient.ClaudeCode]: [/^claude-code\b/, /^local-agent-mode/],
  // Verified through logs
  [McpHostClient.Cursor]: [/^cursor\b/],
  // Neither name is a literal anywhere: VS Code sends `productService.nameLong`,
  // https://github.com/microsoft/vscode/blob/278880aeb30de8d2b16d0d1ee65e5f82a3d869fe/src/vs/workbench/contrib/mcp/common/mcpServerRequestHandler.ts#L136
  // which comes from whichever product.json the build was compiled with. The
  // public repo holds only the OSS one, hence "Code - OSS":
  // https://github.com/microsoft/vscode/blob/1c4f1296821a2349458e01d87910e7bf10ae1c88/product.json#L3
  // Stable builds inject Microsoft's own product.json, which is not open source,
  // so "Visual Studio Code" can only be checked in an install — line 3 of
  // /Applications/Visual Studio Code.app/Contents/Resources/app/product.json
  [McpHostClient.VsCodeCopilot]: [/^visual studio code\b/, /^code - oss\b/],
  // https://github.com/openai/codex/blob/e4e040881acab7e0059775ec58843c43ac6b882f/codex-rs/codex-mcp/src/rmcp_client.rs#L958
  [McpHostClient.Codex]: [/^codex-mcp-client\b/],
  // `gemini-cli-mcp-client` today, with a rename to plain `gemini` proposed
  // upstream, so match the family rather than the one name:
  // https://github.com/google-gemini/gemini-cli/blob/93844dfa10f6d71edc09be40dfde205edfbcc939/packages/core/src/tools/mcp-client.ts#L1848
  [McpHostClient.Gemini]: [/^gemini\b/],
  // 2.0.0 sends `mcp-inspector`, in `clients/cli/build/index.js` of the published
  // package. A bare `inspector` came from an earlier build, seen off the wire
  // here, and the prefix also covers the `-tui` client's own name.
  [McpHostClient.McpInspector]: [/^mcp-inspector\b/, /^inspector\b/],
};

/**
 * Per-host workarounds.
 *
 * Every flag here is a bug in a host, not a feature of ours, so each one needs a
 * ticket and a removal condition. Keeping them in one table instead of inline
 * conditionals means the set of active workarounds is greppable and auditable.
 */
export interface HostQuirks {
  /**
   * Host advertises MCP Apps support but cannot render a `ui://` resource whose
   * HTML is served lazily, so the markup must be a literal string.
   */
  requiresEagerUiHtml?: boolean;
}

/** Known workarounds keyed by host. Absent means the host needs none. */
export const HOST_QUIRKS: Readonly<Partial<Record<McpHostClient, HostQuirks>>> = {
  // Intentionally empty. Add an entry with a TODO and a ticket when a host
  // misbehaves, e.g.:
  //   // TODO(LINK-0000): drop once <host> ships the fix in <version>.
  //   [McpHostClient.SomeHost]: { requiresEagerUiHtml: true },
};

/** Returns the workarounds needed for a host, or an empty object when none apply. */
export function quirksFor(
  /** Host to look up */
  host: McpHostClient,
): HostQuirks {
  return HOST_QUIRKS[host] ?? {};
}

function matchHost(candidate: string | undefined): McpHostClient | undefined {
  if (!candidate) return undefined;
  const normalized = candidate.trim().toLowerCase();
  if (normalized === '') return undefined;
  for (const [host, patterns] of Object.entries(HOST_PATTERNS)) {
    if (patterns.some((pattern) => pattern.test(normalized))) return host as DetectableHost;
  }
  return undefined;
}

/**
 * Identifies the connected MCP host.
 *
 * Prefers `clientInfo.name` from `initialize`, which is present on both stdio
 * and HTTP, and falls back to the forwarded `x-transcend-mcp-caller` header for
 * HTTP callers that proxy on a user's behalf.
 *
 * Never throws. An unrecognized host must degrade to baseline behavior, so it
 * returns {@link McpHostClient.Unknown} instead of failing the session.
 */
export function whatIsTheClient(
  /** Client identity from the `initialize` handshake */
  clientInfo?: Implementation,
  /** Forwarded `x-transcend-mcp-caller` header value */
  callerHeader?: string,
): McpHostClient {
  return matchHost(clientInfo?.name) ?? matchHost(callerHeader) ?? McpHostClient.Unknown;
}
