import { ADMIN_OAUTH_SCOPES } from '@transcend-io/mcp-server-admin';
import { ASSESSMENT_OAUTH_SCOPES } from '@transcend-io/mcp-server-assessment';
import { mergeOAuthScopes } from '@transcend-io/mcp-server-base';
import { CONSENT_OAUTH_SCOPES } from '@transcend-io/mcp-server-consent';
import { DISCOVERY_OAUTH_SCOPES } from '@transcend-io/mcp-server-discovery';
import { DSR_OAUTH_SCOPES } from '@transcend-io/mcp-server-dsr';
import { INVENTORY_OAUTH_SCOPES } from '@transcend-io/mcp-server-inventory';
import { PREFERENCE_OAUTH_SCOPES } from '@transcend-io/mcp-server-preferences';
import { WORKFLOW_OAUTH_SCOPES } from '@transcend-io/mcp-server-workflows';

/** OAuth scopes for the unified MCP server (offline_access added by base). */
export const UMBRELLA_OAUTH_SCOPES = mergeOAuthScopes(
  ADMIN_OAUTH_SCOPES,
  ASSESSMENT_OAUTH_SCOPES,
  CONSENT_OAUTH_SCOPES,
  DISCOVERY_OAUTH_SCOPES,
  DSR_OAUTH_SCOPES,
  INVENTORY_OAUTH_SCOPES,
  PREFERENCE_OAUTH_SCOPES,
  WORKFLOW_OAUTH_SCOPES,
);
