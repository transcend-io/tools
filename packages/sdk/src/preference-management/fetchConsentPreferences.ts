import { PreferenceQueryResponseItem } from '@transcend-io/privacy-types';
import { decodeCodec } from '@transcend-io/type-utils';
import type { Logger } from '@transcend-io/utils';
import type { Got } from 'got';

import { NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
import { withTransientRetry } from '../api/withTransientRetry.js';
import { ConsentPreferenceResponse, type PreferencesQueryFilter } from './types.js';

/**
 * Fetch consent preferences for the managed consent database (new query endpoint)
 *
 * Uses POST /v1/preferences/{partition}/query with cursor pagination.
 *
 * If `onItems` is provided, this streams pages to the callback and does not
 * accumulate results in memory. If omitted, the function returns all items.
 *
 * @param sombra - Sombra instance (must include auth headers)
 * @param options - Query options
 * @returns All nodes (only when onItems is not provided)
 */
export async function fetchConsentPreferences(
  sombra: Got,
  {
    partition,
    filterBy = {},
    limit = 50,
    onItems,
    logger = NOOP_LOGGER,
  }: {
    /** Partition key to fetch (moved to URL path on new endpoint) */
    partition: string;
    /** Query filter (wrapped under "filter" in request body) */
    filterBy?: PreferencesQueryFilter;
    /** Number of users per page (1–50 per API spec) */
    limit?: number;
    /** Optional streaming sink; if provided, pages are not accumulated */
    onItems?: (items: PreferenceQueryResponseItem[]) => Promise<void> | void;
    logger?: Logger;
  },
): Promise<PreferenceQueryResponseItem[]> {
  const collected: PreferenceQueryResponseItem[] = [];

  // Cursor-based pagination per new endpoint
  let cursor: string | undefined;

  // Build the filter payload, omitting empty filter
  const hasFilter =
    filterBy &&
    (Object.keys(filterBy).length > 0 ||
      (filterBy.system && Object.keys(filterBy.system).length > 0));

  // Enforce API max (defensive; backend also validates)
  const pageSize = Math.max(1, Math.min(50, limit ?? 50));

  // Keep fetching until no cursor is returned
  // (The API returns an opaque cursor string for the next page)
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const body: {
      /** Filter by user identifiers (new shape) */
      filter?: PreferencesQueryFilter;
      /** Cursor for pagination */
      cursor?: string;
      /** Number of records per page */
      limit: number;
    } = { limit: pageSize };

    if (hasFilter) {
      body.filter = filterBy;
    }
    if (cursor) {
      body.cursor = cursor;
    }

    const response = await withTransientRetry(
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
          logger.warn(
            `Retry attempt ${attempt} for fetchConsentPreferences due to error: ${message}`,
          );
        },
      },
    );

    const { nodes, cursor: nextCursor } = decodeCodec(ConsentPreferenceResponse, response);

    if (!nodes || nodes.length === 0) {
      break;
    }

    if (onItems) {
      await onItems(nodes);
    } else {
      collected.push(...nodes);
    }

    if (!nextCursor) {
      break;
    }
    cursor = nextCursor;
  }

  return onItems ? [] : collected;
}
