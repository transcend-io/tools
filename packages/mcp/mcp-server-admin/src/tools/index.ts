import type { ToolDefinition, ToolClients } from '@transcend-io/mcp-server-base';

import { createAdminGetCurrentUserTool } from './admin_get_current_user.js';
import { createAdminGetOrganizationTool } from './admin_get_organization.js';
import { createAdminGetPrivacyCenterTool } from './admin_get_privacy_center.js';
import { createAdminListApiKeysTool } from './admin_list_api_keys.js';
import { createAdminListIntlMessagesTool } from './admin_list_intl_messages.js';
import { createAdminListPrivacyPoliciesTool } from './admin_list_privacy_policies.js';
import { createAdminListScopesTool } from './admin_list_scopes.js';
import { createAdminListTeamsTool } from './admin_list_teams.js';
import { createAdminListUsersTool } from './admin_list_users.js';
import { createAdminTestConnectionTool } from './admin_test_connection.js';
import { createAdminWriteIntlMessagesTool } from './admin_write_intl_messages.js';
import { createAdminWritePrivacyCenterTool } from './admin_write_privacy_center.js';
import { createAdminWritePrivacyPoliciesTool } from './admin_write_privacy_policies.js';
import { createAdminWriteTeamsTool } from './admin_write_teams.js';

export function getAdminTools(clients: ToolClients): ToolDefinition[] {
  return [
    createAdminGetOrganizationTool(clients),
    createAdminGetCurrentUserTool(clients),
    createAdminListUsersTool(clients),
    createAdminListTeamsTool(clients),
    createAdminListApiKeysTool(clients),
    createAdminListScopesTool(clients),
    createAdminGetPrivacyCenterTool(clients),
    createAdminListIntlMessagesTool(clients),
    createAdminListPrivacyPoliciesTool(clients),
    createAdminWriteTeamsTool(clients),
    createAdminWritePrivacyCenterTool(clients),
    createAdminWriteIntlMessagesTool(clients),
    createAdminWritePrivacyPoliciesTool(clients),
    createAdminTestConnectionTool(clients),
  ];
}
