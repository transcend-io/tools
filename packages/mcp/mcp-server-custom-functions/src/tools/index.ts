import type { ToolDefinition, ToolClients } from '@transcend-io/mcp-server-base';

import { createCustomFunctionsGetCodeTool } from './custom_functions_get_code.js';
import { createCustomFunctionsListTool } from './custom_functions_list.js';
import { createCustomFunctionsPromoteVersionTool } from './custom_functions_promote_version.js';
import { createCustomFunctionsTestRunTool } from './custom_functions_test_run.js';
import { createCustomFunctionsUpsertTool } from './custom_functions_upsert.js';

export function getCustomFunctionsTools(clients: ToolClients): ToolDefinition[] {
  return [
    createCustomFunctionsUpsertTool(clients),
    createCustomFunctionsListTool(clients),
    createCustomFunctionsGetCodeTool(clients),
    createCustomFunctionsPromoteVersionTool(clients),
    createCustomFunctionsTestRunTool(clients),
  ];
}
