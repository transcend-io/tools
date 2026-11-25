import { defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import {
  decodeYmlItems,
  pushYmlSection,
  ymlItemsSchema,
} from '@transcend-io/mcp-server-base/transcend-yml';
import {
  PreferenceWorkflowConfigInput,
  type PreferenceWorkflowConfigInput as WorkflowConfigInput,
} from '@transcend-io/sdk';

export const WriteWorkflowConfigsSchema = z.object({
  workflowConfigs: ymlItemsSchema(
    'Configs to create or update. Same shape as the transcend.yml preference-workflow-configs ' +
      'section. Use config_get_schema for details.',
    { codec: PreferenceWorkflowConfigInput, max: 50 },
  ),
});
export type WriteWorkflowConfigsInput = z.infer<typeof WriteWorkflowConfigsSchema>;

export function createPreferencesWriteWorkflowConfigsTool(clients: ToolClients) {
  return defineTool({
    name: 'preferences_write_workflow_configs',
    description:
      'Create or update preference workflow configs (consent workflow triggers), keyed by name. ' +
      'Nothing is deleted. Same as the preference-workflow-configs section of `transcend ' +
      'inventory push`. Returns success and any errors.',
    category: 'Preference Management',
    readOnly: false,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    zodSchema: WriteWorkflowConfigsSchema,
    handler: async ({ workflowConfigs }) => {
      const items = decodeYmlItems<WorkflowConfigInput>(
        PreferenceWorkflowConfigInput,
        workflowConfigs,
        'preference-workflow-configs',
        { uniqueBy: (item) => item.name },
      );
      return pushYmlSection(clients, { 'preference-workflow-configs': items }, items.length);
    },
  });
}
