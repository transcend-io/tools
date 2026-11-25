import { mergeOAuthScopes } from '@transcend-io/mcp-server-base';
import { oauthScopesForConfigAllowlist } from '@transcend-io/mcp-server-config';
import {
  MCP_SERVER_OAUTH_SCOPES,
  TranscendMcpServer,
  type TranscendPullResource,
} from '@transcend-io/sdk';

import {
  allowlistIncludesServer,
  MCP_ALLOWLIST_DOCS,
  type McpAllowlistEntry,
  type McpServerAllowlist,
} from './mcp-server-allowlist.js';

/**
 * OAuth scopes for the unified MCP server (offline_access added by base).
 *
 * Only requests scopes for allowlisted servers. When `config` is allowlisted and
 * `configResources` is set, config scopes are capped to those resources. Callers
 * parse the env vars, so this function reads none.
 */
export function resolveUmbrellaOAuthScopes(
  allowlist: McpServerAllowlist,
  configResources: readonly TranscendPullResource[] | undefined,
): readonly string[] {
  const scopeSets: string[][] = [];

  for (const server of Object.values(TranscendMcpServer)) {
    if (!allowlistIncludesServer(allowlist, server)) continue;

    if (server === TranscendMcpServer.Config && configResources) {
      scopeSets.push([...oauthScopesForConfigAllowlist(configResources)]);
      continue;
    }

    scopeSets.push([...MCP_SERVER_OAUTH_SCOPES[server]]);
  }

  return mergeOAuthScopes(...scopeSets);
}

const ALL_SERVERS: McpServerAllowlist = new Set<McpAllowlistEntry>([
  ...Object.values(TranscendMcpServer),
  MCP_ALLOWLIST_DOCS,
]);

/** Every domain scope with no env input. Use `resolveUmbrellaOAuthScopes` to narrow. */
export const UMBRELLA_OAUTH_SCOPES = resolveUmbrellaOAuthScopes(ALL_SERVERS, undefined);
