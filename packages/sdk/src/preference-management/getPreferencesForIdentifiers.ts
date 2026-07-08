import { PreferenceQueryResponseItem } from '@transcend-io/privacy-types';
import { decodeCodec } from '@transcend-io/type-utils';
import { map, type Logger } from '@transcend-io/utils';
import type { Got } from 'got';
import { chunk } from 'lodash-es';

import { NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
import { withTransientRetry } from '../api/withTransientRetry.js';
import { ConsentPreferenceResponse } from './types.js';

/**
 * Grab the current consent preference values for a list of identifiers
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
    skipLogging = false,
    concurrency = 40,
    logger = NOOP_LOGGER,
    onProgress,
  }: {
    /** The list of identifiers to look up */
    identifiers: {
      /** The value of the identifier */
      value: string;
    }[];
    /** The partition key to look up */
    partitionKey: string;
    /** Whether to skip logging */
    skipLogging?: boolean;
    /** Concurrency for requests (default 40) */
    concurrency?: number;
    /** Logger */
    logger?: Logger;
    /** Optional progress callback (completed count, total identifiers) */
    onProgress?: (completed: number, total: number) => void;
  },
): Promise<PreferenceQueryResponseItem[]> {
  const results: PreferenceQueryResponseItem[] = [];
  const groupedIdentifiers = chunk(identifiers, 100);

  const t0 = new Date().getTime();

  let total = 0;
  await map(
    groupedIdentifiers,
    async (group) => {
      const rawResult = await withTransientRetry(
        'Preference Query',
        () =>
          sombra
            .post(`v1/preferences/${partitionKey}/query`, {
              json: {
                filter: { identifiers: group },
                limit: group.length,
              },
            })
            .json(),
        {
          logger,
          onRetry: (attempt, _err, msg) => {
            logger.warn(
              `[RETRY] group size=${group.length} partition=${partitionKey} attempt=${attempt}: ${msg}`,
            );
          },
        },
      );

      const result = decodeCodec(ConsentPreferenceResponse, rawResult);
      results.push(...result.nodes);
      total += group.length;
      onProgress?.(total, identifiers.length);
    },
    {
      concurrency,
    },
  );

  const t1 = new Date().getTime();
  const totalTime = t1 - t0;

  if (!skipLogging) {
    logger.info(`Completed download in "${totalTime / 1000}" seconds.`);
  }

  return results;
}
