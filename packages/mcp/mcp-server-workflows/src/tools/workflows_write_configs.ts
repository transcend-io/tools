import { defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import {
  decodeYmlItems,
  pushYmlSection,
  ymlItemsSchema,
} from '@transcend-io/mcp-server-base/transcend-yml';
import {
  WorkflowConfigInput,
  type WorkflowConfigInput as WorkflowConfigSettings,
} from '@transcend-io/sdk';

export const WriteWorkflowConfigsSchema = z.object({
  workflowConfigs: ymlItemsSchema(
    'DSR workflow configs in transcend.yml `workflow-configs` shape. Each needs `title` and ' +
      '`action-type`. Matched by internal-name, then title, action-type, data-subject-type, and ' +
      'region-list. See config_get_schema.',
    50,
  ),
  publishToPrivacyCenter: z
    .boolean()
    .optional()
    .describe(
      'Publish privacy center after sync when the push creates identifiers or templates. Default false.',
    ),
});
export type WriteWorkflowConfigsInput = z.infer<typeof WriteWorkflowConfigsSchema>;

export function createWorkflowsWriteConfigsTool(clients: ToolClients) {
  return defineTool({
    name: 'workflows_write_configs',
    description:
      'Create or update DSR workflow configs (`workflow-configs` in transcend.yml). Same behavior ' +
      'as `transcend inventory push` for that section, including associations when present in each ' +
      'item. `workflows_update_config` remains for title, subtitle, and description only.',
    category: 'Workflows',
    readOnly: false,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    zodSchema: WriteWorkflowConfigsSchema,
    handler: async ({ workflowConfigs, publishToPrivacyCenter = false }) => {
      const decoded = decodeYmlItems<WorkflowConfigSettings>(
        WorkflowConfigInput,
        workflowConfigs,
        'workflow-configs',
        {
          uniqueBy: (item) => item['internal-name'] ?? item.title,
        },
      );
      return pushYmlSection(clients, { 'workflow-configs': decoded }, decoded.length, {
        publishToPrivacyCenter,
      });
    },
  });
}
