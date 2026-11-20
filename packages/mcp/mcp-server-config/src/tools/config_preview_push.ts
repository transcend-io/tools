import {
  createGraphqlRequestClient,
  defineTool,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import {
  planHasChanges,
  previewPush,
  renderPushPlan,
  summarizePushPlan,
  TR_PUSH_RESOURCE_SCOPE_MAP,
} from '@transcend-io/sdk';

import { assertScopesAvailable } from '../helpers/assertScopesAvailable.js';
import { loadConfigFile } from '../helpers/loadConfigFile.js';
import { resourcesInInput, scopesForResources } from '../helpers/sections.js';

const MAX_DIFF_CHARS = 16_000;

export const ConfigPreviewPushSchema = z.object({
  filePath: z
    .string()
    .describe('Absolute path of the transcend.yml file to preview. Must end in .yml or .yaml.'),
  variables: z
    .record(z.string(), z.string())
    .optional()
    .describe('Values for <<parameters.name>> placeholders in the file, keyed by name.'),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Records per API request when pulling remote state. Defaults to 50.'),
});

export type ConfigPreviewPushInput = z.infer<typeof ConfigPreviewPushSchema>;

export function createConfigPreviewPushTool(clients: ToolClients) {
  return defineTool({
    name: 'config_preview_push',
    description:
      'Dry-run preview for config_push: summary plus text diff, like transcend inventory push --dry-run. ' +
      'Show the diff in chat before pushing.',
    category: 'Config',
    readOnly: true,
    requireLocalFilesystem: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ConfigPreviewPushSchema,
    handler: async ({ filePath, variables = {}, pageSize = 50 }) => {
      const { input } = loadConfigFile(filePath, variables);
      const requiredScopes = scopesForResources(
        resourcesInInput(input),
        TR_PUSH_RESOURCE_SCOPE_MAP,
      );
      assertScopesAvailable(clients.graphql, requiredScopes);

      const client = createGraphqlRequestClient(clients.graphql);
      const plan = await previewPush(client, input, { pageSize });
      const diffFull = renderPushPlan(plan, { title: 'Push preview (nothing was changed)' });
      const truncated = diffFull.length > MAX_DIFF_CHARS;
      const diff = truncated
        ? `${diffFull.slice(0, MAX_DIFF_CHARS)}\n… (diff truncated)`
        : diffFull;

      return {
        hasChanges: planHasChanges(plan),
        summary: summarizePushPlan(plan),
        diff,
        truncated,
        requiredScopes,
      };
    },
  });
}
