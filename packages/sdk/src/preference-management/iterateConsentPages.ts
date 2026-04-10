import type { PreferenceQueryResponseItem } from '@transcend-io/privacy-types';
import { decodeCodec } from '@transcend-io/type-utils';
import type { Logger } from '@transcend-io/utils';
import type { Got } from 'got';

import { ConsentPreferenceResponse, type PreferencesQueryFilter } from './types.js';
import { withPreferenceRetry } from './withPreferenceRetry.js';

/**
 * Async generator over pages for a given filter
 *
 * @param sombra - Sombra Got instance
 * @param partition - Partition key
 * @param filter - Query filter
 * @param pageSize - Number of items per page
 * @param logger - Logger for retries
 * @yields Pages of PreferenceQueryResponseItem
 */
export async function* iterateConsentPages(
  sombra: Got,
  partition: string,
  filter: PreferencesQueryFilter,
  pageSize: number,
  logger: Logger,
): AsyncGenerator<PreferenceQueryResponseItem[], void, void> {
  let cursor: string | undefined;

  while (true) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = { limit: pageSize };
    if (filter && Object.keys(filter).length) body.filter = filter;
    if (cursor) body.cursor = cursor;

    const resp = await withPreferenceRetry(
      'Preference Query',
      () =>
        sombra
          .post(`v1/preferences/${partition}/query`, {
            json: body,
          })
          .json(),
      {
        logger,
        onRetry: (attempt, _error, message) => {
          logger.warn(`Retry attempt ${attempt} for iterateConsentPages due to error: ${message}`);
        },
      },
    );

    const { nodes, cursor: nextCursor } = decodeCodec(ConsentPreferenceResponse, resp);
    if (!nodes?.length) break;

    yield nodes;

    if (!nextCursor) break;
    cursor = nextCursor;
  }
}
