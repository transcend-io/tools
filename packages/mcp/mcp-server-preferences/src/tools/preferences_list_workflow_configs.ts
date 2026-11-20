import {
  createGraphqlRequestClient,
  defineTool,
  EmptySchema,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import {
  convertConsentWorkflowTriggersToInputs,
  fetchAllConsentWorkflowTriggers,
} from '@transcend-io/sdk';

export const ListWorkflowConfigsSchema = EmptySchema;
export type ListWorkflowConfigsInput = Record<string, never>;

export function createPreferencesListWorkflowConfigsTool(clients: ToolClients) {
  return defineTool({
    name: 'preferences_list_workflow_configs',
    description:
      'List preference workflow configs (consent workflow triggers) in the transcend.yml ' +
      'preference-workflow-configs shape: name, purposes with matching states, workflow-title ' +
      'or action-type, and flags. Pass the items to preferences_write_workflow_configs to copy them.',
    category: 'Preference Management',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListWorkflowConfigsSchema,
    handler: async () => {
      const client = createGraphqlRequestClient(clients.graphql);
      const triggers = await fetchAllConsentWorkflowTriggers(client);
      const workflowConfigs = await convertConsentWorkflowTriggersToInputs(client, triggers);
      return { count: workflowConfigs.length, workflowConfigs };
    },
  });
}
