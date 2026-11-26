import { TranscendMcpServer } from '@transcend-io/sdk';

export const TRANSCEND_MCP_SERVERS_ENV = 'TRANSCEND_MCP_SERVERS';

/** Docs tools are not a {@link TranscendMcpServer} domain; allowlist uses this token. */
export const MCP_ALLOWLIST_DOCS = 'docs' as const;

export type McpAllowlistEntry = TranscendMcpServer | typeof MCP_ALLOWLIST_DOCS;

export type McpServerAllowlist = ReadonlySet<McpAllowlistEntry>;

const VALID_MCP_SERVER_NAMES: readonly string[] = [
  ...Object.values(TranscendMcpServer),
  MCP_ALLOWLIST_DOCS,
];

export function formatValidMcpServerNames(): string {
  return VALID_MCP_SERVER_NAMES.join(', ');
}

/**
 * Comma-separated {@link TranscendMcpServer} values plus `docs`.
 * Returns `undefined` when unset so all domains register.
 */
export function parseMcpServerAllowlistFromEnv(): McpServerAllowlist | undefined {
  const raw = process.env[TRANSCEND_MCP_SERVERS_ENV]?.trim();
  if (!raw) return undefined;

  const tokens = raw
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
  if (tokens.length === 0) return undefined;

  const unknown: string[] = [];
  const allowlist = new Set<McpAllowlistEntry>();

  for (const token of tokens) {
    if (token === MCP_ALLOWLIST_DOCS) {
      allowlist.add(MCP_ALLOWLIST_DOCS);
      continue;
    }
    if ((Object.values(TranscendMcpServer) as string[]).includes(token)) {
      allowlist.add(token as TranscendMcpServer);
      continue;
    }
    unknown.push(token);
  }

  if (unknown.length > 0) {
    throw new Error(
      `Unknown ${TRANSCEND_MCP_SERVERS_ENV} value(s): ${unknown.join(', ')}. ` +
        `Valid values: ${formatValidMcpServerNames()}.`,
    );
  }

  return allowlist;
}

/** Effective server allowlist: every domain plus docs when env is unset. */
export function resolveMcpServerAllowlist(): McpServerAllowlist {
  const parsed = parseMcpServerAllowlistFromEnv();
  if (parsed) return parsed;
  return new Set<McpAllowlistEntry>([...Object.values(TranscendMcpServer), MCP_ALLOWLIST_DOCS]);
}

export function allowlistIncludesDocs(allowlist: McpServerAllowlist): boolean {
  return allowlist.has(MCP_ALLOWLIST_DOCS);
}

export function allowlistIncludesServer(
  allowlist: McpServerAllowlist,
  server: TranscendMcpServer,
): boolean {
  return allowlist.has(server);
}
