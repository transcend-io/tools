import { IdentifierType } from '@transcend-io/privacy-types';
import { decodeCodec, valuesOf } from '@transcend-io/type-utils';
import type { Logger } from '@transcend-io/utils';
import type { Got } from 'got';
import { GraphQLClient } from 'graphql-request';
import * as t from 'io-ts';
import semver from 'semver';

import { makeGraphQLRequest, NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
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

const PAGE_SIZE = 50;

export const RequestIdentifiersResponse = t.type({
  identifiers: t.array(RequestIdentifier),
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
  let offset = 0;
  let shouldContinue = false;

  if (!skipSombraCheck) {
    await validateSombraVersion(client, { logger });
  }

  do {
    let response: unknown;
    try {
      response = await sombra!
        .post<{
          /** Decrypted identifiers */
          identifiers: RequestIdentifier[];
        }>('v1/request-identifiers', {
          json: {
            first: PAGE_SIZE,
            offset,
            requestId,
          },
        })
        .json();
    } catch (err) {
      throw new Error(`Failed to fetch request identifiers: ${(err as Error).message}`);
    }

    const { identifiers: nodes } = decodeCodec(RequestIdentifiersResponse, response);

    requestIdentifiers.push(...nodes);

    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return requestIdentifiers;
}
