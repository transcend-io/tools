import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-core';

import type { WorkflowsMixin } from '../graphql.js';

const UpdateWorkflowConfigSchema = z.object({
  workflow_config_id: z.string(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  show_in_privacy_center: z.boolean().optional(),
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
      try {
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
      } catch (error) {
        return createToolResult(
          false,
          undefined,
          error instanceof Error ? error.message : String(error),
        );
      }
    },
  });
}
