import {
  createCollectedLogger,
  createGraphqlRequestClient,
  createToolResult,
  defineTool,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import {
  buildSnapshotRequest,
  planHasChanges,
  planPush,
  pullTranscendConfiguration,
  renderPushPlanDiff,
  TR_PULL_RESOURCE_SCOPE_MAP,
  type PushPlan,
} from '@transcend-io/sdk';

import { assertScopesAvailable } from '../helpers/assertScopesAvailable.js';
import { loadConfigFile } from '../helpers/loadConfigFile.js';
import { scopesForResources } from '../helpers/sections.js';

export const ConfigDiffSchema = z.object({
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
    .describe('Records per API request when pulling the live snapshot. Defaults to 50.'),
  maxLines: z
    .number()
    .int()
    .min(10)
    .max(2000)
    .optional()
    .describe('Maximum diff lines before truncation. Defaults to 400.'),
  deleteExtraAttributeValues: z
    .boolean()
    .optional()
    .describe(
      'Match config_push: attribute values missing from the file are deleted remotely. Defaults to false.',
    ),
  includePlan: z
    .boolean()
    .optional()
    .describe('When true, include the full structured push plan JSON. Defaults to false.'),
});

export type ConfigDiffInput = z.infer<typeof ConfigDiffSchema>;

function nextStep(hasChanges: boolean): string {
  if (!hasChanges) {
    return 'The live organization already matches this file. config_push would be a no-op.';
  }
  return (
    'Paste the diff field into your reply exactly as returned (including the ```diff fence), ' +
    'summarize risks for the user, and only call config_push after they agree.'
  );
}

export function createConfigDiffTool(clients: ToolClients) {
  return defineTool({
    name: 'config_diff',
    description:
      'Dry-run preview for config_push: compares transcend.yml to live org state and returns a ' +
      'paste-ready fenced diff plus side effects (for example domain list replacement). Read-only.',
    category: 'Config',
    readOnly: true,
    requireLocalFilesystem: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ConfigDiffSchema,
    handler: async ({
      filePath,
      variables = {},
      pageSize = 50,
      maxLines = 400,
      deleteExtraAttributeValues = false,
      includePlan = false,
    }) => {
      const { input } = loadConfigFile(filePath, variables);
      const snapshot = buildSnapshotRequest(input);
      const requiredScopes = scopesForResources(snapshot.resources, TR_PULL_RESOURCE_SCOPE_MAP);
      assertScopesAvailable(clients.graphql, requiredScopes);

      const { logger, logs } = createCollectedLogger();
      const remote = await pullTranscendConfiguration(createGraphqlRequestClient(clients.graphql), {
        ...snapshot,
        dataSiloIds: [],
        integrationNames: [],
        pageSize,
        debug: false,
        logger,
      });

      const plan: PushPlan = planPush(input, remote, { deleteExtraAttributeValues });
      const { markdown: diff, truncated, lineCount } = renderPushPlanDiff(plan, { maxLines });
      const hasChanges = planHasChanges(plan);

      return createToolResult(
        true,
        {
          hasChanges,
          summary: plan.summary,
          diff,
          truncated,
          lineCount,
          effects: plan.effects,
          warnings: plan.warnings,
          ignoredResources: plan.ignoredResources,
          requiredScopes,
          nextStep: nextStep(hasChanges),
          ...(includePlan && { plan }),
          ...(logs.some((entry) => entry.level !== 'info') && { logs }),
        },
        undefined,
      );
    },
  });
}
