import type { Implementation } from '@modelcontextprotocol/sdk/types.js';

/**
 * Extension identifier hosts use to advertise MCP Apps support (SEP-1865),
 * found under `ClientCapabilities.extensions`.
 *
 * Lives with the capability layer rather than beside the view-serving code
 * because the handshake is what consumes it: deriving a capability report needs
 * this identifier before anything renders. `tools/ui-resource.ts` re-exports it
 * for callers that think of it as part of the view surface.
 */
export const MCP_UI_EXTENSION_ID = 'io.modelcontextprotocol/ui';

/**
 * MIME type identifying an HTML MCP App view. Hosts key off this exact string,
 * including the profile parameter, so it must not be reformatted.
 *
 * Read during the handshake too: a host declares which MIME types it accepts,
 * and a view is only offered when this one is among them.
 */
export const MCP_APP_MIME_TYPE = 'text/html;profile=mcp-app';

/**
 * MCP client capabilities this framework can act on when shaping tool behavior.
 *
 * Deliberately narrow: a member earns its place only once a tool variant can do
 * something meaningfully different because of it. Sampling and roots are
 * excluded — roots is inert for API-backed servers (there is no filesystem
 * scope to negotiate), our target hosts do not implement sampling, and both are
 * deprecated as of the 2026-07-28 spec under SEP-2577.
 */
export enum McpClientCapability {
  /** Host renders server-requested forms via `elicitation/create` in `form` mode */
  Elicitation = 'ELICITATION',
  /** Host opens a server-supplied URL via `elicitation/create` in `url` mode */
  ElicitationUrl = 'ELICITATION_URL',
  /** Host renders `ui://` HTML resources in a sandboxed iframe (MCP Apps, SEP-1865) */
  McpApp = 'MCP_APP',
}

/**
 * MCP hosts we recognize.
 *
 * Values are lowercase kebab-case because they double as the outbound
 * attribution value for `MCP_CALLER_HEADER`, matching the format callers
 * already forward over HTTP.
 *
 * A host is only listed once a real `clientInfo.name` has been seen for it, so
 * that {@link McpHostClient.Unknown} means "not yet observed" rather than "the
 * pattern was wrong". See `HOST_PATTERNS` for the evidence behind each one.
 */
export enum McpHostClient {
  /**
   * Any Claude chat surface.
   *
   * Desktop and web are one value because both report `claude-ai`, so the
   * surfaces cannot be told apart from the handshake. Split this only if a
   * distinct string turns up.
   */
  Claude = 'claude',
  /** Claude Code, in the terminal or its desktop app */
  ClaudeCode = 'claude-code',
  /** Cursor IDE */
  Cursor = 'cursor',
  /** GitHub Copilot inside Visual Studio Code */
  VsCodeCopilot = 'vscode-copilot',
  /** OpenAI Codex */
  Codex = 'codex',
  /** Google Gemini CLI */
  Gemini = 'gemini',
  /** Official MCP Inspector, used for local development via `pnpm mcp:inspect` */
  McpInspector = 'mcp-inspector',
  /** Host could not be identified; behave as conservatively as possible */
  Unknown = 'unknown',
}

/**
 * Everything we know about the connected MCP host for the current session.
 *
 * Derived once per connection from the `initialize` handshake and read by tool
 * variant resolution, outbound request attribution, and session logging.
 */
export interface ClientCapabilityReport {
  /** Capabilities the host declared that we can act on */
  capabilities: ReadonlySet<McpClientCapability>;
  /** Best-effort identification of the connected host */
  host: McpHostClient;
  /** Raw `clientInfo` from `initialize`, retained for logging and debugging */
  clientInfo?: Implementation;
}

/**
 * Report used when no `initialize` handshake has happened yet, or when the
 * client declared nothing we can act on. Every capability check against it is
 * false, so tools fall back to their baseline behavior.
 */
export const EMPTY_CAPABILITY_REPORT: ClientCapabilityReport = {
  capabilities: new Set(),
  host: McpHostClient.Unknown,
};
