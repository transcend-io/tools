import type { ToolDefinition, ToolClients } from '@transcend-io/mcp-server-base';

import { createAdminGetCurrentUserTool } from './admin_get_current_user.js';
import { createAdminGetOrganizationTool } from './admin_get_organization.js';
import { createAdminListActionItemCollectionsTool } from './admin_list_action_item_collections.js';
import { createAdminListActionItemsTool } from './admin_list_action_items.js';
import { createAdminListApiKeysTool } from './admin_list_api_keys.js';
import { createAdminListScopesTool } from './admin_list_scopes.js';
import { createAdminListTeamsTool } from './admin_list_teams.js';
import { createAdminListUsersTool } from './admin_list_users.js';
import { createAdminTestConnectionTool } from './admin_test_connection.js';
import { createAdminWriteActionItemCollectionsTool } from './admin_write_action_item_collections.js';
import { createAdminWriteActionItemsTool } from './admin_write_action_items.js';
import { createAdminWriteTeamsTool } from './admin_write_teams.js';
import { getGraphqlTools } from './graphql/index.js';

export function getAdminTools(clients: ToolClients): ToolDefinition[] {
  return [
    createAdminGetOrganizationTool(clients),
    createAdminGetCurrentUserTool(clients),
    createAdminListUsersTool(clients),
    createAdminListTeamsTool(clients),
    createAdminListApiKeysTool(clients),
    createAdminListScopesTool(clients),
    createAdminListActionItemsTool(clients),
    createAdminWriteActionItemsTool(clients),
    createAdminListActionItemCollectionsTool(clients),
    createAdminWriteActionItemCollectionsTool(clients),
    createAdminWriteTeamsTool(clients),
    createAdminTestConnectionTool(clients),
    ...getGraphqlTools(clients),
  ];
}
