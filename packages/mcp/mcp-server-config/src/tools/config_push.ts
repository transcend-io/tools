import {
  createCollectedLogger,
  createGraphqlRequestClient,
  defineTool,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import {
  previewPush,
  summarizePushPlan,
  syncConfigurationToTranscend,
  TR_PUSH_RESOURCE_SCOPE_MAP,
} from '@transcend-io/sdk';

import { assertScopesAvailable } from '../helpers/assertScopesAvailable.js';
import {
  assertResourcesInAllowlist,
  parseConfigResourceAllowlistFromEnv,
} from '../helpers/configResourceAllowlist.js';
import { loadConfigFile } from '../helpers/loadConfigFile.js';
import { countConfigSections, resourcesInInput, scopesForResources } from '../helpers/sections.js';

export const ConfigPushSchema = z.object({
  filePath: z
    .string()
    .describe('Absolute path of the transcend.yml file to push. Must end in .yml or .yaml.'),
  variables: z
    .record(z.string(), z.string())
    .optional()
    .describe(
      'Values for <<parameters.name>> placeholders in the file, keyed by name. ' +
        'Every placeholder in the file needs a value.',
    ),
  publishToPrivacyCenter: z
    .boolean()
    .optional()
    .describe('Publish privacy center changes after the push. Defaults to false.'),
  classifyService: z
    .boolean()
    .optional()
    .describe('Run service classification on data silos during the push. Defaults to false.'),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Records per API request. Defaults to 50.'),
});

export type ConfigPushInput = z.infer<typeof ConfigPushSchema>;

export function createConfigPushTool(clients: ToolClients) {
  return defineTool({
    name: 'config_push',
    description:
      'Push a transcend.yml file from disk to Transcend, creating and updating resources to ' +
      'match it. Same behavior as `transcend inventory push`. Empty sections are skipped. ' +
      'Run config_diff first (or config_preview_push for a structured summary). Returns success, ' +
      'per-resource errors, and warnings. Use config_get_schema for the file format and config_pull ' +
      'to start from the current state.',
    category: 'Config',
    readOnly: false,
    requireLocalFilesystem: true,
    confirmation: {
      hint:
        'Creates and updates resources in the Transcend organization to match the transcend.yml ' +
        'file at filePath. Run config_diff first and confirm the diff with the user. Resources ' +
        'missing from the file are not deleted in most sections, but consent-manager domains and ' +
        'some lists are replaced wholesale. Check filePath and publishToPrivacyCenter before agreeing.',
      describe: async (args) => {
        const filePath = args.filePath;
        if (typeof filePath !== 'string') return undefined;
        const variables =
          args.variables !== null &&
          typeof args.variables === 'object' &&
          !Array.isArray(args.variables)
            ? (args.variables as Record<string, string>)
            : {};
        const pageSize = typeof args.pageSize === 'number' ? args.pageSize : 50;

        const { input } = loadConfigFile(filePath, variables);
        const client = createGraphqlRequestClient(clients.graphql);
        const plan = await previewPush(client, input, { pageSize });
        return summarizePushPlan(plan);
      },
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
    zodSchema: ConfigPushSchema,
    handler: async ({
      filePath,
      variables = {},
      publishToPrivacyCenter = false,
      classifyService = false,
      pageSize = 50,
    }) => {
      const { input } = loadConfigFile(filePath, variables);

      const sectionsInFile = resourcesInInput(input);
      assertResourcesInAllowlist(sectionsInFile, parseConfigResourceAllowlistFromEnv());

      const requiredScopes = scopesForResources(sectionsInFile, TR_PUSH_RESOURCE_SCOPE_MAP);
      assertScopesAvailable(clients.graphql, requiredScopes);

      const { logger, logs } = createCollectedLogger();
      const result = await syncConfigurationToTranscend(
        input,
        createGraphqlRequestClient(clients.graphql),
        { pageSize, publishToPrivacyCenter, classifyService, logger },
      );

      return {
        success: result.success,
        errors: result.errors,
        ...(result.warnings && { warnings: result.warnings }),
        sections: countConfigSections(input),
        requiredScopes,
        ...(!result.success && { logs: result.logs ?? logs }),
      };
    },
  });
}
