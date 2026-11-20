import {
  CollectedLogLevel,
  createCollectedLogger,
  createGraphqlRequestClient,
  ErrorCode,
  ToolError,
  z,
  type CollectedLog,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import {
  pullTranscendConfiguration,
  syncConfigurationToTranscend,
  TR_YML_RESOURCE_TO_FIELD_NAME,
  type TranscendInput,
  type TranscendPullResource,
} from '@transcend-io/sdk';
import { decodeCodec } from '@transcend-io/type-utils';

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

/** Most items one write call accepts. */
export const MAX_WRITE_ITEMS = 100;

/**
 * Zod schema for the `items` argument of a `transcend.yml` section write tool.
 * The real validation runs against the same io-ts codec the yml uses.
 *
 * @param itemDescription - What one item looks like, in a sentence
 * @returns The zod array schema
 */
export function ymlItemsSchema(itemDescription: string) {
  return z
    .array(z.record(z.string(), z.unknown()))
    .min(1)
    .max(MAX_WRITE_ITEMS)
    .describe(
      `${itemDescription} Same shape as the transcend.yml section; see config_get_schema. ` +
        `Up to ${MAX_WRITE_ITEMS} items.`,
    );
}

/**
 * Decode each item with the codec the yml uses, so a tool accepts exactly what the file accepts.
 *
 * @param codec - io-ts codec for one item
 * @param items - Raw items from the tool call
 * @returns The decoded items
 * @throws ToolError naming the first invalid item
 */
export function decodeYmlItems<C extends Parameters<typeof decodeCodec>[0]>(
  codec: C,
  items: unknown[],
): ReturnType<typeof decodeCodec<C>>[] {
  return items.map((item, index) => {
    try {
      return decodeCodec(codec, item, false);
    } catch (error) {
      throw new ToolError(
        ErrorCode.VALIDATION_ERROR,
        `items[${index}] is not valid: ${error instanceof Error ? error.message : String(error)}`,
        false,
      );
    }
  });
}

/** Compact result of a section write. */
export interface YmlWriteResult {
  /** Whether every item synced */
  success: boolean;
  /** Items sent */
  count: number;
  /** Per-resource errors */
  errors: {
    /** Section name */
    resource: string;
    /** Item key, when known */
    item?: string;
    /** Error text */
    message: string;
  }[];
  /** Non-fatal warnings */
  warnings?: string[];
  /** Log lines, only on failure */
  logs?: CollectedLog[];
}

/**
 * Push one `transcend.yml` section, exactly as `transcend inventory push` does.
 *
 * @param clients - Tool clients
 * @param section - The partial yml input holding only the section being written
 * @param count - Number of items written
 * @returns Compact sync result
 */
export async function pushYmlSection(
  clients: ToolClients,
  section: TranscendInput,
  count: number,
): Promise<YmlWriteResult> {
  const { logger, logs } = createCollectedLogger();
  let result;
  try {
    result = await syncConfigurationToTranscend(
      section,
      createGraphqlRequestClient(clients.graphql),
      { publishToPrivacyCenter: false, logger },
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
 * Pull one `transcend.yml` section, exactly as `transcend inventory pull` does.
 *
 * @param clients - Tool clients
 * @param resource - Section to pull
 * @returns The section items in `transcend.yml` shape
 */
export async function pullYmlSection(
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
  const items = configuration[TR_YML_RESOURCE_TO_FIELD_NAME[resource]];
  return Array.isArray(items) ? items : [];
}
