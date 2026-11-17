import {
  createGraphqlRequestClient,
  defineTool,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import { syncConsentWorkflowTriggers } from '@transcend-io/sdk';
import {
  PreferenceWorkflowConfigInput,
  type PreferenceWorkflowConfigInput as WorkflowConfigInput,
} from '@transcend-io/sdk/transcend-yml';

import { decodeItems, runSync } from '../helpers/syncRun.js';

export const WriteWorkflowConfigsSchema = z.object({
  workflowConfigs: z
    .array(
      z.object({
        name: z.string().describe('Config name. Upsert key: an existing name is updated.'),
        purposes: z
          .array(
            z.object({
              'tracking-type': z.string().describe('Purpose tracking type'),
              'matching-state': z.boolean().describe('Consent state that triggers the workflow'),
            }),
          )
          .describe(
            'Purposes and the consent states that trigger the workflow. Must not be empty.',
          ),
        'workflow-title': z
          .string()
          .optional()
          .describe('DSR workflow title. Do not combine with action-type or data-silo-titles.'),
        'action-type': z
          .string()
          .optional()
          .describe(
            'Request action such as ERASURE. Legacy mode, required on create without workflow-title.',
          ),
        'data-subject-type': z
          .string()
          .optional()
          .describe('Data subject type slug, such as customer'),
        'is-silent': z.boolean().optional().describe('Run without notifying the user'),
        'allow-unauthenticated': z.boolean().optional().describe('Allow unauthenticated requests'),
        'is-active': z.boolean().optional().describe('Whether the config is active'),
        'data-silo-titles': z
          .array(z.string())
          .optional()
          .describe('Data silo titles to include. Legacy mode only.'),
      }),
    )
    .min(1)
    .max(50)
    .describe(
      'Configs to create or update. Same shape as the transcend.yml preference-workflow-configs ' +
        'section. Use config_get_schema for details.',
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
      const items = decodeItems<WorkflowConfigInput>(
        PreferenceWorkflowConfigInput,
        workflowConfigs,
        'preference-workflow-configs',
      );
      const client = createGraphqlRequestClient(clients.graphql);
      return runSync(items.length, (logger) =>
        syncConsentWorkflowTriggers(client, items, { logger }),
      );
    },
  });
}
