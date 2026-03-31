import { PreferenceQueryResponseItem } from '@transcend-io/privacy-types';
import { decodeCodec } from '@transcend-io/type-utils';
import { extractErrorMessage, map, splitInHalf, type Logger } from '@transcend-io/utils';
import type { Got } from 'got';
import { chunk } from 'lodash-es';

import { ConsentPreferenceResponse, type PreferenceUploadProgress } from './types.js';
import { withPreferenceRetry } from './withPreferenceRetry.js';

/**
 * Grab the current consent preference values for a list of identifiers.
 *
 * Uses recursive split-on-validation: if a group fails with
 * "did not pass validation", it is halved and retried. Singletons
 * that still fail are skipped.
 *
 * @param sombra - Backend to make API call to
 * @param options - Options
 * @returns Plaintext context information
 */
export async function getPreferencesForIdentifiers(
  sombra: Got,
  {
    identifiers,
    partitionKey,
    onProgress,
    logInterval = 10000,
    skipLogging = false,
    concurrency = 40,
    logger,
  }: {
    /** The list of identifiers to look up */
    identifiers: {
      /** The value of the identifier */
      value: string;
      /** The name of the identifier */
      name: string;
    }[];
    /** The partition key to look up */
    partitionKey: string;
    /** Whether to skip logging */
    skipLogging?: boolean;
    /** The interval to log upload progress */
    logInterval?: number;
    /** Concurrency for fetching identifiers */
    concurrency?: number;
    /** Logger */
    logger: Logger;
    /** Progress callback */
    onProgress?: (info: PreferenceUploadProgress) => void;
  },
): Promise<PreferenceQueryResponseItem[]> {
  const results: PreferenceQueryResponseItem[] = [];
  const groupedIdentifiers = chunk(identifiers, 100);

  const t0 = new Date().getTime();

  let total = 0;
  onProgress?.({
    successDelta: 0,
    successTotal: 0,
    fileTotal: identifiers.length,
  });

  const maybeLogProgress = (delta: number): void => {
    onProgress?.({
      successDelta: delta,
      successTotal: total,
      fileTotal: identifiers.length,
    });

    if (skipLogging) return;
    const shouldLog =
      total % logInterval === 0 ||
      Math.floor((total - identifiers.length) / logInterval) < Math.floor(total / logInterval);
    if (shouldLog) {
      logger.info(
        `Fetched ${total}/${identifiers.length} user preferences from partition ${partitionKey}`,
      );
    }
  };

  const postGroupWithRetries = async (
    group: { value: string; name: string }[],
  ): Promise<PreferenceQueryResponseItem[]> => {
    const rawResult = await withPreferenceRetry(
      'Preference Query',
      () =>
        sombra
          .post(`v1/preferences/${partitionKey}/query`, {
            json: {
              filter: { identifiers: group },
            },
          })
          .json(),
      {
        logger,
        onRetry: (attempt, _err, msg) => {
          logger.warn(
            `[RETRY v1/preferences/${partitionKey}/query] ` +
              `group size=${group.length} partition=${partitionKey} attempt=${attempt}: ${msg}`,
          );
        },
      },
    );

    const result = decodeCodec(ConsentPreferenceResponse, rawResult);
    return result.nodes;
  };

  /**
   * Recursively process a group:
   * - Try to fetch in one go.
   * - If it fails with "did not pass validation", split into halves and recurse.
   * - If the group is a singleton and still fails validation, skip it.
   */
  const processGroup = async (group: { value: string; name: string }[]): Promise<void> => {
    try {
      const nodes = await postGroupWithRetries(group);
      results.push(...nodes);
      total += group.length;
      maybeLogProgress(group.length);
    } catch (err) {
      const msg = extractErrorMessage(err);

      if (/did not pass validation/i.test(msg)) {
        if (group.length === 1) {
          const only = group[0]!;
          logger.warn(`Skipping identifier "${only.value}" (${only.name}): ${msg}`);
          total += 1;
          maybeLogProgress(1);
          return;
        }

        const [left, right] = splitInHalf(group);
        logger.warn(
          `Group of ${group.length} did not pass validation. Splitting into ${left.length} and ${right.length}.`,
        );
        await processGroup(left);
        await processGroup(right);
        return;
      }

      throw err;
    }
  };

  await map(
    groupedIdentifiers,
    async (group) => {
      await processGroup(group);
    },
    { concurrency },
  );

  const t1 = new Date().getTime();
  const totalTime = t1 - t0;

  if (!skipLogging) {
    logger.info(`Completed download in "${totalTime / 1000}" seconds.`);
  }

  return results;
}
