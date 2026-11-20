import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

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
  DEFAULT_TRANSCEND_PULL_RESOURCES,
  pullTranscendConfiguration,
  serializeTranscendYaml,
  TR_PULL_RESOURCE_SCOPE_MAP,
  TranscendPullResource,
} from '@transcend-io/sdk';

import { assertScopesAvailable } from '../helpers/assertScopesAvailable.js';
import { assertConfigFilePath } from '../helpers/configFilePath.js';
import { parseResources } from '../helpers/resources.js';
import { countConfigSections, scopesForResources } from '../helpers/sections.js';
import { parseTrackerStatuses } from '../helpers/trackerStatuses.js';

export const ConfigPullSchema = z.object({
  filePath: z
    .string()
    .describe('Absolute path of the transcend.yml file to write. Must end in .yml or .yaml.'),
  resources: z
    .array(z.string())
    .optional()
    .describe(
      'Section names to pull, such as ["dataSilos", "purposes"]. Use ["all"] for every section. ' +
        `Defaults to ${DEFAULT_TRANSCEND_PULL_RESOURCES.join(', ')}. Valid names: config_get_schema.`,
    ),
  dataSiloIds: z
    .array(z.string())
    .optional()
    .describe('Only pull these data silo IDs. Cannot be combined with integrationNames.'),
  integrationNames: z
    .array(z.string())
    .optional()
    .describe('Only pull data silos of these integration types, such as "salesforce".'),
  trackerStatuses: z
    .array(z.string())
    .optional()
    .describe('Cookie and data flow statuses to pull: LIVE or NEEDS_REVIEW. Defaults to all.'),
  skipDatapoints: z
    .boolean()
    .optional()
    .describe('Skip data points when pulling data silos. Faster for large organizations.'),
  skipSubDatapoints: z
    .boolean()
    .optional()
    .describe('Skip sub data points when pulling data silos.'),
  includeGuessedCategories: z
    .boolean()
    .optional()
    .describe('Include metadata about guessed data categories.'),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Records per API request. Defaults to 50.'),
  overwrite: z
    .boolean()
    .optional()
    .describe('Replace the file if it exists. Defaults to false, which fails instead.'),
});

export type ConfigPullInput = z.infer<typeof ConfigPullSchema>;

export function createConfigPullTool(clients: ToolClients) {
  return defineTool({
    name: 'config_pull',
    description:
      'Pull organization configuration from Transcend into a transcend.yml file on disk. ' +
      'Same output as `transcend inventory pull`. Returns per-section counts, never the file ' +
      'contents. Read the file to see it. Use config_get_schema to learn the file format.',
    category: 'Config',
    readOnly: false,
    requireLocalFilesystem: true,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    zodSchema: ConfigPullSchema,
    handler: async ({
      filePath,
      resources,
      dataSiloIds = [],
      integrationNames = [],
      trackerStatuses,
      skipDatapoints,
      skipSubDatapoints,
      includeGuessedCategories,
      pageSize = 50,
      overwrite = false,
    }) => {
      const target = assertConfigFilePath(filePath);
      if (existsSync(target) && !overwrite) {
        throw new ToolError(
          ErrorCode.VALIDATION_ERROR,
          `${target} already exists. Pass overwrite: true to replace it.`,
          false,
        );
      }

      const resourcesToPull: TranscendPullResource[] = !resources
        ? [...DEFAULT_TRANSCEND_PULL_RESOURCES]
        : resources.includes('all')
          ? Object.values(TranscendPullResource)
          : parseResources(resources);

      const requiredScopes = scopesForResources(resourcesToPull, TR_PULL_RESOURCE_SCOPE_MAP);
      assertScopesAvailable(clients.graphql, requiredScopes);

      const { logger, logs } = createCollectedLogger();
      const configuration = await pullTranscendConfiguration(
        createGraphqlRequestClient(clients.graphql),
        {
          dataSiloIds,
          integrationNames,
          resources: resourcesToPull,
          trackerStatuses: trackerStatuses && parseTrackerStatuses(trackerStatuses),
          skipDatapoints,
          skipSubDatapoints,
          includeGuessedCategories,
          pageSize,
          debug: false,
          logger,
        },
      );

      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, serializeTranscendYaml(configuration));

      return {
        filePath: target,
        resources: resourcesToPull,
        sections: countConfigSections(configuration),
        requiredScopes,
        ...(logs.some((log) => log.level !== 'info') && { logs }),
      };
    },
  });
}
