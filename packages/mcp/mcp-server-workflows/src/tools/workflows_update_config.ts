import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import type { WorkflowsMixin } from '../graphql.js';

export const UpdateWorkflowConfigSchema = z.object({
  workflowConfigId: z
    .string()
    .describe('ID of the workflow config to update (use workflows_list to find config IDs)'),
  title: z.string().optional().describe('New title for the workflow'),
  subtitle: z.string().optional().describe('New subtitle for the workflow'),
  description: z.string().optional().describe('New description for the workflow'),
});
export type UpdateWorkflowConfigInput = z.infer<typeof UpdateWorkflowConfigSchema>;

export function createWorkflowsUpdateConfigTool(clients: ToolClients) {
  const graphql = clients.graphql as WorkflowsMixin;
  return defineTool({
    name: 'workflows_update_config',
    description:
      'Update the configuration for a workflow. Supported fields: title, subtitle, description. ' +
      "Note: privacy-center visibility is controlled by the workflow config's visibility tier and " +
      'is not editable through this tool.',
    category: 'Workflows',
    readOnly: false,
    confirmationHint: 'Updates the workflow configuration',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    zodSchema: UpdateWorkflowConfigSchema,
    handler: async ({ workflowConfigId, title, subtitle, description }) => {
      const updates: {
        title?: string;
        subtitle?: string;
        description?: string;
      } = {};

      if (title !== undefined) updates.title = title;
      if (subtitle !== undefined) updates.subtitle = subtitle;
      if (description !== undefined) updates.description = description;

      const result = await graphql.updateWorkflowConfig(workflowConfigId, updates);

      return createToolResult(true, {
        workflowConfig: result,
        message: 'Workflow configuration updated successfully',
      });
    },
  });
}
