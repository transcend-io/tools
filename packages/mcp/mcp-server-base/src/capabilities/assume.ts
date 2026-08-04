import { McpClientCapability } from './types.js';

/**
 * Environment variable that forces capabilities on regardless of what the client
 * declared, as a comma-separated list of {@link McpClientCapability} values.
 *
 * This exists for one specific reason. The MCP Apps spec has hosts advertise
 * support through `capabilities.extensions["io.modelcontextprotocol/ui"]`, and
 * this server correctly withholds a tool's view when that is absent. But the v1
 * MCP Inspector ships an Apps tab while declaring `capabilities: {}`, so against
 * a spec-correct server its Apps tab is always empty. Rather than weaken
 * negotiation for every host, `pnpm mcp:inspect` sets this variable so the
 * Inspector can see views.
 *
 * Never set this in production: it makes the server claim a host can render a
 * view when it may not, which shows up as a blank panel instead of a graceful
 * text fallback.
 */
export const ASSUME_CAPABILITIES_ENV_VAR = 'TRANSCEND_MCP_ASSUME_CAPABILITIES';

const KNOWN_CAPABILITIES = new Set<string>(Object.values(McpClientCapability));

/** Outcome of reading the override, including entries that made no sense. */
export interface AssumedCapabilities {
  /** Capabilities to force on */
  capabilities: McpClientCapability[];
  /** Entries that matched no known capability, kept so callers can warn */
  unknown: string[];
}

/**
 * Parses a comma-separated capability list.
 *
 * Unknown entries are collected rather than thrown, because this is a debugging
 * aid: a typo should produce a warning and a working server, not a startup
 * failure.
 *
 * @param raw - Raw environment variable value
 * @returns Recognized capabilities plus any unrecognized entries
 */
export function parseAssumedCapabilities(raw: string | undefined): AssumedCapabilities {
  if (!raw) return { capabilities: [], unknown: [] };

  const capabilities: McpClientCapability[] = [];
  const unknown: string[] = [];

  for (const entry of raw.split(',')) {
    const trimmed = entry.trim();
    if (trimmed === '') continue;
    const normalized = trimmed.toUpperCase();
    if (KNOWN_CAPABILITIES.has(normalized)) {
      const capability = normalized as McpClientCapability;
      if (!capabilities.includes(capability)) capabilities.push(capability);
    } else {
      unknown.push(trimmed);
    }
  }

  return { capabilities, unknown };
}

/** Reads {@link ASSUME_CAPABILITIES_ENV_VAR} from the environment. */
export function assumedCapabilitiesFromEnv(): AssumedCapabilities {
  return parseAssumedCapabilities(process.env[ASSUME_CAPABILITIES_ENV_VAR]);
}
