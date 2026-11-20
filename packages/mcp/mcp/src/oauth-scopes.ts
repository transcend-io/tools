import { mergeOAuthScopes } from '@transcend-io/mcp-server-base';
import { MCP_SERVER_OAUTH_SCOPES, TranscendMcpServer } from '@transcend-io/sdk';

/** OAuth scopes for the unified MCP server (offline_access added by base). */
export const UMBRELLA_OAUTH_SCOPES = mergeOAuthScopes(
  ...Object.values(TranscendMcpServer).map((server) => MCP_SERVER_OAUTH_SCOPES[server]),
);
