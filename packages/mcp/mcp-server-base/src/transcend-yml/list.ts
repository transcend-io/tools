import type { TranscendPullResource } from '@transcend-io/sdk';

import { derivePageInfo } from '../clients/graphql/pagination.js';
import { createListResult } from '../tools/helpers.js';
import type { ToolClients } from '../tools/types.js';
import { pullYmlSectionRaw } from './push.js';
import type { ListYmlSectionOptions } from './types.js';

/**
 * List one transcend.yml section with in-memory pagination, in the same shape CLI pull uses.
 *
 * @param clients - Tool clients
 * @param resource - Section to list
 * @param options - Offset, limit, and filter
 * @returns A paginated list result
 */
export async function listYmlSection(
  clients: ToolClients,
  resource: TranscendPullResource,
  options: ListYmlSectionOptions = {},
) {
  const { offset = 0, limit = 50, filter } = options;
  let items = await pullYmlSectionRaw(clients, resource);
  if (filter) {
    items = items.filter(filter);
  }
  const page = items.slice(offset, offset + limit);
  return createListResult(page, {
    totalCount: items.length,
    hasNextPage: derivePageInfo({
      offset,
      nodeCount: page.length,
      totalCount: items.length,
    }).hasNextPage,
  });
}

/**
 * List every row in a transcend.yml section without pagination.
 *
 * @param clients - Tool clients
 * @param resource - Section to list
 * @param filter - Optional row filter
 * @returns A list result with every row on one page
 */
export async function listAllYmlSection(
  clients: ToolClients,
  resource: TranscendPullResource,
  filter?: (item: unknown) => boolean,
) {
  let items = await pullYmlSectionRaw(clients, resource);
  if (filter) {
    items = items.filter(filter);
  }
  return createListResult(items, { totalCount: items.length, hasNextPage: false });
}
