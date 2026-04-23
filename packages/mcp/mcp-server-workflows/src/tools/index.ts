import type { ToolDefinition, ToolClients } from '@transcend-io/mcp-server-base';

import { createWorkflowsListTool } from './workflows_list.js';
import { createWorkflowsListEmailTemplatesTool } from './workflows_list_email_templates.js';
import { createWorkflowsUpdateConfigTool } from './workflows_update_config.js';

export function getWorkflowTools(clients: ToolClients): ToolDefinition[] {
  return [
    createWorkflowsListTool(clients),
    createWorkflowsUpdateConfigTool(clients),
    createWorkflowsListEmailTemplatesTool(clients),
  ];
}
