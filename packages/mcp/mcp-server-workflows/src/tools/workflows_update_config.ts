import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-core';

import type { WorkflowsMixin } from '../graphql.js';

const UpdateWorkflowConfigSchema = z.object({
  workflow_config_id: z
    .string()
    .describe('ID of the workflow config to update (use workflows_list to find config IDs)'),
  title: z.string().optional().describe('New title for the workflow'),
  subtitle: z.string().optional().describe('New subtitle for the workflow'),
  description: z.string().optional().describe('New description for the workflow'),
  show_in_privacy_center: z
    .boolean()
    .optional()
    .describe('Whether to show this workflow in the Privacy Center'),
});

export function createWorkflowsUpdateConfigTool(clients: ToolClients) {
  const graphql = clients.graphql as WorkflowsMixin;
  return defineTool({
    name: 'workflows_update_config',
    description:
      'Update the configuration for a workflow (title, subtitle, description, privacy center visibility)',
    category: 'Workflows',
    readOnly: false,
    confirmationHint: 'Updates the workflow configuration',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    zodSchema: UpdateWorkflowConfigSchema,
    handler: async ({
      workflow_config_id,
      title,
      subtitle,
      description,
      show_in_privacy_center,
    }) => {
      const updates: {
        title?: string;
        subtitle?: string;
        description?: string;
        showInPrivacyCenter?: boolean;
      } = {};

      if (title !== undefined) {
        updates.title = title;
      }
      if (subtitle !== undefined) {
        updates.subtitle = subtitle;
      }
      if (description !== undefined) {
        updates.description = description;
      }
      if (show_in_privacy_center !== undefined) {
        updates.showInPrivacyCenter = show_in_privacy_center;
      }

      const result = await graphql.updateWorkflowConfig(workflow_config_id, updates);

      return createToolResult(true, {
        workflowConfig: result,
        message: 'Workflow configuration updated successfully',
      });
    },
  });
}
