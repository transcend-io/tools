import {
  createToolResult,
  z,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';

import type { WorkflowsMixin } from '../graphql.js';

const UpdateWorkflowConfigSchema = z.object({
  workflow_config_id: z.string(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  show_in_privacy_center: z.boolean().optional(),
});

export function createWorkflowsUpdateConfigTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as WorkflowsMixin;
  return {
    name: 'workflows_update_config',
    description:
      'Update the configuration for a workflow (title, subtitle, description, privacy center visibility)',
    category: 'Workflows',
    readOnly: false,
    confirmationHint: 'Updates the workflow configuration',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    zodSchema: UpdateWorkflowConfigSchema,
    handler: async (rawArgs) => {
      const args = rawArgs as z.infer<typeof UpdateWorkflowConfigSchema>;
      try {
        const updates: {
          title?: string;
          subtitle?: string;
          description?: string;
          showInPrivacyCenter?: boolean;
        } = {};

        if (args.title !== undefined) {
          updates.title = args.title;
        }
        if (args.subtitle !== undefined) {
          updates.subtitle = args.subtitle;
        }
        if (args.description !== undefined) {
          updates.description = args.description;
        }
        if (args.show_in_privacy_center !== undefined) {
          updates.showInPrivacyCenter = args.show_in_privacy_center;
        }

        const result = await graphql.updateWorkflowConfig(args.workflow_config_id, updates);

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
  };
}
