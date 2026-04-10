import type { ToolDefinition, ToolClients } from '@transcend-io/mcp-server-core';

import { createAdminCreateApiKeyTool } from './admin_create_api_key.js';
import { createAdminGetCurrentUserTool } from './admin_get_current_user.js';
import { createAdminGetOrganizationTool } from './admin_get_organization.js';
import { createAdminGetPrivacyCenterTool } from './admin_get_privacy_center.js';
import { createAdminListApiKeysTool } from './admin_list_api_keys.js';
import { createAdminListTeamsTool } from './admin_list_teams.js';
import { createAdminListUsersTool } from './admin_list_users.js';
import { createAdminTestConnectionTool } from './admin_test_connection.js';

export function getAdminTools(clients: ToolClients): ToolDefinition[] {
  return [
    createAdminGetOrganizationTool(clients),
    createAdminGetCurrentUserTool(clients),
    createAdminListUsersTool(clients),
    createAdminListTeamsTool(clients),
    createAdminListApiKeysTool(clients),
    createAdminCreateApiKeyTool(clients),
    createAdminGetPrivacyCenterTool(clients),
    createAdminTestConnectionTool(clients),
  ];
}
