import { IdentifierType } from '@transcend-io/privacy-types';
import { decodeCodec, valuesOf } from '@transcend-io/type-utils';
import { map, type Logger } from '@transcend-io/utils';
import type { Got } from 'got';
import { GraphQLClient } from 'graphql-request';
import * as t from 'io-ts';
import { chunk } from 'lodash-es';
import semver from 'semver';

import { makeGraphQLRequest, NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
import { withTransientRetry } from '../api/withTransientRetry.js';
import { SOMBRA_VERSION } from './gqls/sombraVersion.js';

const MIN_SOMBRA_VERSION_TO_DECRYPT = '7.180.0';

const RequestIdentifier = t.type({
  /** ID of request */
  id: t.string,
  /** Name of identifier */
  name: t.string,
  /** The underlying identifier value */
  value: t.string,
  /** Type of identifier */
  type: valuesOf(IdentifierType),
});

/** Type override */
export type RequestIdentifier = t.TypeOf<typeof RequestIdentifier>;

const PAGE_SIZE = 100;

/**
 * Upper bound on simultaneous identifier fetches. Callers that fan out across
 * multiple streams (e.g. date-range chunks) should divide this budget by the
 * number of streams so total Sombra connections stay bounded.
 */
export const MAX_IDENTIFIER_FETCH_CONCURRENCY = 200;

const PageInfo = t.type({
  endCursor: t.union([t.string, t.null]),
  hasNextPage: t.boolean,
});

export const RequestIdentifiersResponse = t.type({
  identifiers: t.array(RequestIdentifier),
  pageInfo: PageInfo,
});

const BatchRequestIdentifier = t.type({
  id: t.string,
  name: t.string,
  value: t.string,
  type: valuesOf(IdentifierType),
  requestId: t.string,
});

const BatchRequestIdentifiersResponse = t.type({
  identifiers: t.array(BatchRequestIdentifier),
  pageInfo: PageInfo,
});

/**
 * Validate that the Sombra version meets the minimum requirement for
 * decrypting request identifiers. Call once before bulk-fetching identifiers
 * to avoid repeating this check on every request.
 *
 * @param client - GraphQL client
 * @param options - Options
 */
export async function validateSombraVersion(
  client: GraphQLClient,
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<void> {
  const { logger = NOOP_LOGGER } = options;
  const {
    organization: {
      sombra: { version },
    },
  } = await makeGraphQLRequest<{
    /** The organization */
    organization: {
      /** Sombra */
      sombra: {
        /** Version string */
        version: string;
      };
    };
  }>(client, SOMBRA_VERSION, { logger });

  if (version && semver.lt(version, MIN_SOMBRA_VERSION_TO_DECRYPT)) {
    throw new Error(
      `Please upgrade Sombra to ${MIN_SOMBRA_VERSION_TO_DECRYPT} or greater to use this command.`,
    );
  }
}

/**
 * Fetch all request identifiers for a particular request
 *
 * @deprecated Use {@link fetchRequestIdentifiersBatch} instead, which batches
 * multiple requests into a single paginated call. This per-request variant is
 * retained only for backwards compatibility and has no internal callers.
 * @param client - GraphQL client
 * @param sombra - Sombra client
 * @param options - Options
 * @returns List of request identifiers
 */
export async function fetchAllRequestIdentifiers(
  client: GraphQLClient,
  sombra: Got,
  options: {
    /** Filter options */
    filterBy: {
      /** ID of request to filter on */
      requestId: string;
    };
    /** Skip the Sombra version check (caller already validated) */
    skipSombraCheck?: boolean;
    /** Logger instance */
    logger?: Logger;
  },
): Promise<RequestIdentifier[]> {
  const {
    filterBy: { requestId },
    skipSombraCheck = false,
    logger = NOOP_LOGGER,
  } = options;
  const requestIdentifiers: RequestIdentifier[] = [];
  let endCursor: string | undefined;
  let shouldContinue = true;

  if (!skipSombraCheck) {
    await validateSombraVersion(client, { logger });
  }

  while (shouldContinue) {
    // `POST /v1/request-identifiers` is effectively a paginated read (the server
    // never mutates state from this call), so it is safe to retry on transient
    // gateway / network errors. Retries matter here because a single export can
    // span thousands of pages and occasional 502s from the Sombra reverse
    // tunnel or upstream load balancer would otherwise abort the whole chunk.
    const response = await withTransientRetry(
      'Failed to fetch request identifiers',
      () =>
        sombra!
          .post<{
            /** Decrypted identifiers */
            identifiers: RequestIdentifier[];
            /** Pagination info */
            pageInfo: {
              /** Cursor for the last item */
              endCursor: string | null;
              /** Whether more pages exist */
              hasNextPage: boolean;
            };
          }>('v1/request-identifiers', {
            json: {
              first: PAGE_SIZE,
              after: endCursor ?? undefined,
              requestId,
            },
          })
          .json(),
      { logger, maxAttempts: 6, baseDelayMs: 500 },
    );

    const { identifiers: nodes, pageInfo } = decodeCodec(RequestIdentifiersResponse, response);

    requestIdentifiers.push(...nodes);

    endCursor = pageInfo.endCursor ?? undefined;
    shouldContinue = pageInfo.hasNextPage;
  }

  return requestIdentifiers;
}

/**
 * Fetch request identifiers for multiple requests in a single paginated call.
 * Returns a Map keyed by requestId so callers can look up identifiers per request.
 *
 * @param sombra - Sombra client
 * @param options - Options
 * @returns Map of requestId to its identifiers
 */
export async function fetchRequestIdentifiersBatch(
  sombra: Got,
  options: {
    /** IDs of requests to fetch identifiers for */
    requestIds: string[];
    /** Logger instance */
    logger?: Logger;
    /** Number of requestId groups to fetch in parallel */
    concurrency?: number;
  },
): Promise<Map<string, RequestIdentifier[]>> {
  const {
    requestIds,
    logger = NOOP_LOGGER,
    concurrency = MAX_IDENTIFIER_FETCH_CONCURRENCY,
  } = options;
  const result = new Map<string, RequestIdentifier[]>();

  if (requestIds.length === 0) {
    return result;
  }

  // Ensure every requested ID has an entry even if Sombra returns nothing for it
  for (const id of requestIds) {
    result.set(id, []);
  }

  // A cursor stream is inherently sequential, so to parallelize we split the
  // requestIds into groups and walk each group's cursor concurrently. Each
  // group keeps the batched call's lower request count while regaining the
  // parallelism the per-request fetch used to provide.
  const fetchGroup = async (groupRequestIds: string[]): Promise<void> => {
    let cursor: string | undefined;
    let shouldContinue = true;

    while (shouldContinue) {
      const response = await withTransientRetry(
        'Failed to fetch request identifiers',
        () =>
          sombra
            .post<{
              /** Decrypted identifiers, each tagged with its owning request ID */
              identifiers: (RequestIdentifier & {
                /** ID of the request the identifier belongs to */
                requestId: string;
              })[];
              /** Pagination info */
              pageInfo: {
                /** Cursor for the last item */
                endCursor: string | null;
                /** Whether more pages exist */
                hasNextPage: boolean;
              };
            }>('v1/request-identifiers', {
              json: {
                first: PAGE_SIZE,
                after: cursor ?? undefined,
                requestIds: groupRequestIds,
              },
            })
            .json(),
        { logger, maxAttempts: 6, baseDelayMs: 500 },
      );

      const { identifiers: nodes, pageInfo } = decodeCodec(
        BatchRequestIdentifiersResponse,
        response,
      );

      // Groups operate on disjoint requestIds, so concurrent writes never
      // target the same Map entry.
      for (const { requestId, ...identifier } of nodes) {
        const list = result.get(requestId);
        if (list) {
          list.push(identifier);
        } else {
          result.set(requestId, [identifier]);
        }
      }

      cursor = pageInfo.endCursor ?? undefined;
      shouldContinue = pageInfo.hasNextPage;
    }
  };

  // Split into exactly `concurrency` groups (largest batches that still keep
  // every worker busy) so each group is a separate cursor walk run in parallel.
  const groupCount = Math.min(concurrency, requestIds.length);
  const groupSize = Math.ceil(requestIds.length / groupCount);
  await map(chunk(requestIds, groupSize), fetchGroup, { concurrency });

  return result;
}
