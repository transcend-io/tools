import type { ToolDefinition, ToolClients } from '@transcend-io/mcp-server-base';

import { createPreferencesAppendIdentifiersTool } from './preferences_append_identifiers.js';
import { createPreferencesDeleteTool } from './preferences_delete.js';
import { createPreferencesDeleteIdentifiersTool } from './preferences_delete_identifiers.js';
import { createPreferencesQueryTool } from './preferences_query.js';
import { createPreferencesUpdateIdentifiersTool } from './preferences_update_identifiers.js';
import { createPreferencesUpsertTool } from './preferences_upsert.js';

export function getPreferenceTools(clients: ToolClients): ToolDefinition[] {
  return [
    createPreferencesQueryTool(clients),
    createPreferencesUpsertTool(clients),
    createPreferencesDeleteTool(clients),
    createPreferencesAppendIdentifiersTool(clients),
    createPreferencesUpdateIdentifiersTool(clients),
    createPreferencesDeleteIdentifiersTool(clients),
  ];
}
