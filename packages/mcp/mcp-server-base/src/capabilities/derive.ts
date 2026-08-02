import type { ClientCapabilities, Implementation } from '@modelcontextprotocol/sdk/types.js';

import { whatIsTheClient } from './client-detection.js';
import {
  MCP_APP_MIME_TYPE,
  MCP_UI_EXTENSION_ID,
  McpClientCapability,
  type ClientCapabilityReport,
} from './types.js';

/**
 * Where the capability report is derived from.
 *
 * Passed as a plain object rather than a {@link Server} so derivation stays a
 * pure function that is trivial to unit test. It also keeps the signature
 * stable for the 2026-07-28 protocol, which moves client info and capabilities
 * out of `initialize` and into per-request `_meta`: only the call site that
 * assembles this object would need to change.
 */
export interface ClientCapabilitySource {
  /** Capabilities the client declared, from `initialize` */
  capabilities?: ClientCapabilities;
  /** Client identity, from `initialize` */
  clientInfo?: Implementation;
  /** Forwarded `x-transcend-mcp-caller` value, used to identify HTTP callers */
  callerHeader?: string;
  /**
   * Capabilities to treat as present no matter what the client declared.
   *
   * Passed in rather than read from the environment here so this stays a pure
   * function. Only local debugging tooling supplies it — see
   * `ASSUME_CAPABILITIES_ENV_VAR`.
   */
  assumeCapabilities?: readonly McpClientCapability[];
}

/**
 * Shape of the MCP Apps extension settings a host advertises. The spec requires
 * `mimeTypes`, but hosts in the wild have shipped a bare `{}`, so treat a
 * missing or empty list as "supports the default HTML profile" rather than
 * refusing to render.
 */
interface McpUiExtensionSettings {
  /** Content types the host can render */
  mimeTypes?: unknown;
}

/**
 * Whether the host can render a server-requested form.
 *
 * The SDK normalizes a bare `elicitation: {}` into `{ form: {} }` while parsing
 * `initialize`, so capabilities read off a live `Server` already have `form`
 * set. This function is also called with raw objects — by tests, and by whatever
 * assembles capabilities once they move into per-request `_meta` — so it applies
 * the same rule itself rather than assuming normalization already happened.
 */
function supportsFormElicitation(capabilities: ClientCapabilities | undefined): boolean {
  const elicitation = capabilities?.elicitation;
  if (!elicitation) return false;
  if (elicitation.form) return true;
  return Object.keys(elicitation).length === 0;
}

function supportsMcpApps(capabilities: ClientCapabilities | undefined): boolean {
  const settings = capabilities?.extensions?.[MCP_UI_EXTENSION_ID] as
    | McpUiExtensionSettings
    | undefined;
  if (!settings) return false;

  const { mimeTypes } = settings;
  if (!Array.isArray(mimeTypes) || mimeTypes.length === 0) return true;
  return mimeTypes.some(
    (mimeType) => typeof mimeType === 'string' && mimeType.trim() === MCP_APP_MIME_TYPE,
  );
}

/**
 * Reduces a client's declared capabilities to the set this framework can act
 * on, plus a best-effort host identification.
 *
 * Only elicitation and MCP Apps are detected. Sampling and roots are omitted on
 * purpose: roots is inert for API-backed servers, our target hosts do not
 * implement sampling, and both are deprecated as of the 2026-07-28 spec.
 */
export function deriveClientCapabilities(source: ClientCapabilitySource): ClientCapabilityReport {
  const { capabilities, clientInfo, callerHeader, assumeCapabilities } = source;
  const detected = new Set<McpClientCapability>();

  if (supportsFormElicitation(capabilities)) {
    detected.add(McpClientCapability.Elicitation);
  }
  if (capabilities?.elicitation?.url) {
    detected.add(McpClientCapability.ElicitationUrl);
  }
  if (supportsMcpApps(capabilities)) {
    detected.add(McpClientCapability.McpApp);
  }

  for (const capability of assumeCapabilities ?? []) {
    detected.add(capability);
  }

  return {
    capabilities: detected,
    host: whatIsTheClient(clientInfo, callerHeader),
    ...(clientInfo && { clientInfo }),
  };
}

/** Renders a report's capability set as a stable, sorted list for logging. */
export function describeCapabilities(
  /** Report whose capabilities should be summarized */
  report: ClientCapabilityReport,
): string[] {
  return [...report.capabilities].sort();
}
