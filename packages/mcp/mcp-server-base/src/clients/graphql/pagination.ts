import type { PaginationInfo } from '../../types/transcend.js';

/**
 * Derive `pageInfo` for an offset-paginated list field.
 *
 * Almost no Transcend list payload carries a `pageInfo` — they return `nodes`
 * plus `totalCount` — so every mixin has to synthesize one. Doing that by hand
 * invites `nodeCount < totalCount`, which ignores how far into the result set
 * the page starts and therefore stays `true` on the final page. An agent told
 * to page until `hasNextPage` is false then loops forever.
 *
 * @param params.offset - Rows skipped before this page.
 * @param params.nodeCount - Rows actually returned in this page.
 * @param params.totalCount - Rows matching the query overall.
 */
export function derivePageInfo({
  offset,
  nodeCount,
  totalCount,
}: {
  offset: number;
  nodeCount: number;
  totalCount: number;
}): PaginationInfo {
  return {
    hasNextPage: offset + nodeCount < totalCount,
    hasPreviousPage: offset > 0,
  };
}
