import {
  createToolResult,
  validateArgs,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';

import type { WorkflowsMixin } from '../graphql.js';
import { UpdateWorkflowConfigSchema } from '../schemas.js';

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
    inputSchema: {
      type: 'object',
      properties: {
        workflow_config_id: {
          type: 'string',
          description:
            'ID of the workflow config to update (use workflows_list to find config IDs)',
        },
        title: {
          type: 'string',
          description: 'New title for the workflow',
        },
        subtitle: {
          type: 'string',
          description: 'New subtitle for the workflow',
        },
        description: {
          type: 'string',
          description: 'New description for the workflow',
        },
        show_in_privacy_center: {
          type: 'boolean',
          description: 'Whether to show this workflow in the Privacy Center',
        },
      },
      required: ['workflow_config_id'],
    },
    handler: async (args) => {
      const parsed = validateArgs(UpdateWorkflowConfigSchema, args);
      if (!parsed.success) return parsed.error;
      try {
        const updates: {
          title?: string;
          subtitle?: string;
          description?: string;
          showInPrivacyCenter?: boolean;
        } = {};

        if (parsed.data.title !== undefined) {
          updates.title = parsed.data.title;
        }
        if (parsed.data.subtitle !== undefined) {
          updates.subtitle = parsed.data.subtitle;
        }
        if (parsed.data.description !== undefined) {
          updates.description = parsed.data.description;
        }
        if (parsed.data.show_in_privacy_center !== undefined) {
          updates.showInPrivacyCenter = parsed.data.show_in_privacy_center;
        }

        const result = await graphql.updateWorkflowConfig(parsed.data.workflow_config_id, updates);

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
