import { decodeCodec } from '@transcend-io/type-utils';
import type { Logger } from '@transcend-io/utils';
import type { Got } from 'got';

import { NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
import { ConsentPreferenceResponse, type PreferencesQueryFilter, type ChunkMode } from './types.js';
import { withPreferenceRetry } from './withPreferenceRetry.js';

/**
 * Probe window: does it contain any records? Uses the given mode.
 *
 * @param sombra - Sombra
 * @param options - Options
 * @returns True if any records exist in the given window
 */
export async function consentWindowHasAny(
  sombra: Got,
  {
    partition,
    mode,
    baseFilter,
    afterISO,
    beforeISO,
    logger = NOOP_LOGGER,
  }: {
    /** Partition */
    partition: string;
    /** Chunking mode */
    mode: ChunkMode;
    /** Base filter */
    baseFilter: PreferencesQueryFilter;
    /** After ISO date */
    afterISO: string;
    /** Before ISO date */
    beforeISO: string;
    logger?: Logger;
  },
): Promise<boolean> {
  const filter: PreferencesQueryFilter =
    mode === 'timestamp'
      ? {
          ...baseFilter,
          timestampAfter: afterISO,
          timestampBefore: beforeISO,
          system: baseFilter.system,
        }
      : {
          ...baseFilter,
          timestampAfter: undefined,
          timestampBefore: undefined,
          system: {
            ...baseFilter.system,
            updatedAfter: afterISO,
            updatedBefore: beforeISO,
          },
        };
  const resp = await withPreferenceRetry(
    'Preference Query',
    () =>
      sombra
        .post(`v1/preferences/${partition}/query`, {
          json: { limit: 1, filter },
        })
        .json(),
    {
      logger,
      onRetry: (attempt, error, message) => {
        logger.warn(`Retry attempt ${attempt} for consentWindowHasAny due to error: ${message}`);
      },
    },
  );

  const { nodes } = decodeCodec(ConsentPreferenceResponse, resp);
  return Array.isArray(nodes) && nodes.length > 0;
}
