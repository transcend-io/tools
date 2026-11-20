import { readFileSync } from 'node:fs';

import {
  createCollectedLogger,
  createGraphqlRequestClient,
  defineTool,
  ErrorCode,
  ToolError,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import {
  parseTranscendYaml,
  syncConfigurationToTranscend,
  TR_PUSH_RESOURCE_SCOPE_MAP,
} from '@transcend-io/sdk';

import { assertScopesAvailable } from '../helpers/assertScopesAvailable.js';
import { assertConfigFilePath } from '../helpers/configFilePath.js';
import {
  assertResourcesInAllowlist,
  parseConfigResourceAllowlistFromEnv,
} from '../helpers/configResourceAllowlist.js';
import {
  countConfigSections,
  resourcesInInput,
  scopesForResources,
  stripEmptyConfigSections,
} from '../helpers/sections.js';

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
      'Returns success, per-resource errors, and warnings. Use config_get_schema for the file ' +
      'format and config_pull to start from the current state.',
    category: 'Config',
    readOnly: false,
    requireLocalFilesystem: true,
    confirmation: {
      hint:
        'Creates and updates resources in the Transcend organization to match the transcend.yml ' +
        'file at filePath, across every section the file contains (data silos, purposes, ' +
        'workflows, policies, and more). Resources missing from the file are not deleted, but ' +
        'matching resources are overwritten. Check the file path, and whether ' +
        'publishToPrivacyCenter is set, before agreeing.',
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    zodSchema: ConfigPushSchema,
    handler: async ({
      filePath,
      variables = {},
      publishToPrivacyCenter = false,
      classifyService = false,
      pageSize = 50,
    }) => {
      const source = assertConfigFilePath(filePath);

      let contents: string;
      try {
        contents = readFileSync(source, 'utf-8');
      } catch (error) {
        throw new ToolError(
          ErrorCode.VALIDATION_ERROR,
          `Could not read ${source}: ${error instanceof Error ? error.message : String(error)}`,
          false,
        );
      }

      let input;
      try {
        input = stripEmptyConfigSections(parseTranscendYaml(contents, variables, source));
      } catch (error) {
        throw new ToolError(
          ErrorCode.VALIDATION_ERROR,
          `${source} is not a valid transcend.yml: ${
            error instanceof Error ? error.message : String(error)
          }`,
          false,
        );
      }

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
