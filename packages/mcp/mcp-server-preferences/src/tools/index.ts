import type { ToolDefinition, ToolClients } from '@transcend-io/mcp-server-base';

import { createPreferencesAppendIdentifiersTool } from './preferences_append_identifiers.js';
import { createPreferencesDeleteTool } from './preferences_delete.js';
import { createPreferencesDeleteIdentifiersTool } from './preferences_delete_identifiers.js';
import { createPreferencesListOptionValuesTool } from './preferences_list_option_values.js';
import { createPreferencesListPartitionsTool } from './preferences_list_partitions.js';
import { createPreferencesListWorkflowConfigsTool } from './preferences_list_workflow_configs.js';
import { createPreferencesQueryTool } from './preferences_query.js';
import { createPreferencesUpdateIdentifiersTool } from './preferences_update_identifiers.js';
import { createPreferencesUpsertTool } from './preferences_upsert.js';
import { createPreferencesWriteOptionValuesTool } from './preferences_write_option_values.js';
import { createPreferencesWritePartitionsTool } from './preferences_write_partitions.js';
import { createPreferencesWriteWorkflowConfigsTool } from './preferences_write_workflow_configs.js';

export function getPreferenceTools(clients: ToolClients): ToolDefinition[] {
  return [
    createPreferencesListPartitionsTool(clients),
    createPreferencesQueryTool(clients),
    createPreferencesUpsertTool(clients),
    createPreferencesDeleteTool(clients),
    createPreferencesAppendIdentifiersTool(clients),
    createPreferencesUpdateIdentifiersTool(clients),
    createPreferencesDeleteIdentifiersTool(clients),
    createPreferencesWritePartitionsTool(clients),
    createPreferencesListOptionValuesTool(clients),
    createPreferencesWriteOptionValuesTool(clients),
    createPreferencesListWorkflowConfigsTool(clients),
    createPreferencesWriteWorkflowConfigsTool(clients),
  ];
}
