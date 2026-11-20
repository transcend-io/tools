import {
  pullTranscendConfiguration,
  syncConfigurationToTranscend,
  TR_YML_RESOURCE_TO_FIELD_NAME,
  type TranscendInput,
  type TranscendPullResource,
} from '@transcend-io/sdk';

import { createGraphqlRequestClient } from '../clients/graphql/graphql-request-client.js';
import {
  CollectedLogLevel,
  createCollectedLogger,
  type CollectedLog,
} from '../helpers/collectingLogger.js';
import type { ToolClients } from '../tools/types.js';
import type { PushYmlSectionOptions, SectionWriteResult } from './types.js';

const SYNC_LOG_LEVEL: Record<string, CollectedLogLevel> = {
  debug: CollectedLogLevel.Debug,
  info: CollectedLogLevel.Info,
  warn: CollectedLogLevel.Warn,
  error: CollectedLogLevel.Error,
};

/** Map SDK sync log lines to {@link CollectedLog} for tool results. */
function asCollectedLogs(
  entries: ReadonlyArray<{ level: string; message: string }>,
): CollectedLog[] {
  return entries.map((entry) => ({
    level: SYNC_LOG_LEVEL[entry.level] ?? CollectedLogLevel.Info,
    message: entry.message,
  }));
}

/**
 * Push one or more transcend.yml sections, the same way `transcend inventory push` does.
 *
 * @param clients - Tool clients
 * @param section - Partial yaml input holding only the sections being written
 * @param count - Number of top-level items sent (array length or 1 for a singleton)
 * @param options - Push flags
 * @returns Compact sync result
 */
export async function pushYmlSection(
  clients: ToolClients,
  section: TranscendInput,
  count: number,
  options: PushYmlSectionOptions = {},
): Promise<SectionWriteResult> {
  const { publishToPrivacyCenter = false, classifyService = false } = options;
  const { logger, logs } = createCollectedLogger();
  let result;
  try {
    result = await syncConfigurationToTranscend(
      section,
      createGraphqlRequestClient(clients.graphql),
      { publishToPrivacyCenter, classifyService, logger },
    );
  } catch (error) {
    return {
      success: false,
      count,
      errors: [
        {
          resource: Object.keys(section).join(','),
          message: error instanceof Error ? error.message : String(error),
        },
      ],
      logs,
    };
  }
  return {
    success: result.success,
    count,
    errors: result.errors,
    ...(result.warnings && { warnings: result.warnings }),
    ...(!result.success && { logs: result.logs ? asCollectedLogs(result.logs) : logs }),
  };
}

/**
 * Pull a yaml section without pagination, for tools that fetch the full set.
 *
 * @param clients - Tool clients
 * @param resource - Section to pull
 * @returns Rows in transcend.yml shape (singleton sections as a one-element array)
 */
export async function pullYmlSectionRaw(
  clients: ToolClients,
  resource: TranscendPullResource,
): Promise<unknown[]> {
  const { logger } = createCollectedLogger();
  const configuration = await pullTranscendConfiguration(
    createGraphqlRequestClient(clients.graphql),
    {
      dataSiloIds: [],
      integrationNames: [],
      resources: [resource],
      pageSize: 50,
      debug: false,
      logger,
    },
  );
  const field = TR_YML_RESOURCE_TO_FIELD_NAME[resource];
  const value = configuration[field as keyof typeof configuration];
  if (Array.isArray(value)) {
    return value;
  }
  if (value !== undefined && value !== null && typeof value === 'object') {
    return [value];
  }
  return [];
}
