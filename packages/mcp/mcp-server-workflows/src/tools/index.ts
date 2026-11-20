import type { ToolDefinition, ToolClients } from '@transcend-io/mcp-server-base';

import { createWorkflowsListTool } from './workflows_list.js';
import { createWorkflowsListActionItemCollectionsTool } from './workflows_list_action_item_collections.js';
import { createWorkflowsListActionItemsTool } from './workflows_list_action_items.js';
import { createWorkflowsListEmailTemplatesTool } from './workflows_list_email_templates.js';
import { createWorkflowsUpdateConfigTool } from './workflows_update_config.js';
import { createWorkflowsWriteActionItemCollectionsTool } from './workflows_write_action_item_collections.js';
import { createWorkflowsWriteActionItemsTool } from './workflows_write_action_items.js';
import { createWorkflowsWriteEmailTemplatesTool } from './workflows_write_email_templates.js';

export function getWorkflowTools(clients: ToolClients): ToolDefinition[] {
  return [
    createWorkflowsListTool(clients),
    createWorkflowsUpdateConfigTool(clients),
    createWorkflowsListEmailTemplatesTool(clients),
    createWorkflowsWriteEmailTemplatesTool(clients),
    createWorkflowsListActionItemsTool(clients),
    createWorkflowsWriteActionItemsTool(clients),
    createWorkflowsListActionItemCollectionsTool(clients),
    createWorkflowsWriteActionItemCollectionsTool(clients),
  ];
}
