import type { SombraStandardScope } from '@transcend-io/privacy-types';
import { map, type Logger } from '@transcend-io/utils';
import type { GraphQLClient } from 'graphql-request';
import { chunk } from 'lodash-es';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { CREATE_PREFERENCE_ACCESS_TOKENS } from './gqls/preferenceAccessTokens.js';

export interface PreferenceAccessTokenInput {
  /** Slug of data subject to authenticate as */
  subjectType: string;
  /** Scopes to grant */
  scopes: SombraStandardScope[];
  /** Expiration time in seconds */
  expiresIn?: number;
  /** Email address of user */
  email: string;
  /** Core identifier for the user */
  coreIdentifier?: string;
}

export interface PreferenceAccessTokenInputWithIndex extends PreferenceAccessTokenInput {
  /** Index of the input record */
  index?: number;
}

const MAX_BATCH_SIZE = 50;

/**
 * Create preference access tokens for a single page of identifiers.
 *
 * @param client - GraphQL client
 * @param records - Inputs to sign
 * @param logger - Logger
 * @returns list of access tokens
 */
async function createPreferenceAccessTokensPage(
  client: GraphQLClient,
  records: PreferenceAccessTokenInput[],
  logger: Logger,
): Promise<string[]> {
  const {
    createPrivacyCenterAccessTokens: { nodes },
  } = await makeGraphQLRequest<{
    /** createPrivacyCenterAccessTokens mutation */
    createPrivacyCenterAccessTokens: {
      /** Nodes */
      nodes: {
        /** Token */
        token: string;
      }[];
    };
  }>(client, CREATE_PREFERENCE_ACCESS_TOKENS, {
    logger,
    variables: { input: { records } },
  });
  return nodes.map((node) => node.token);
}

/**
 * Create preference access tokens for the given identifiers.
 *
 * @see https://docs.transcend.io/docs/articles/preference-management/access-links
 * @param client - GraphQL client
 * @param options - Options
 * @returns list of access tokens/input identifiers
 */
export async function createPreferenceAccessTokens(
  client: GraphQLClient,
  options: {
    /** Records to create tokens for */
    records: PreferenceAccessTokenInputWithIndex[];
    /** Logger instance */
    logger: Logger;
    /** Optional progress emitter */
    emitProgress?: (progress: number) => void;
    /** Number of concurrent requests to make (default: 10) */
    concurrency?: number;
  },
): Promise<
  {
    /** Identifier for the record */
    input: PreferenceAccessTokenInputWithIndex;
    /** Access token */
    accessToken: string;
  }[]
> {
  const { records, logger, emitProgress, concurrency = 10 } = options;

  let completed = 0;
  emitProgress?.(0);

  const results: {
    /** Identifier for the record */
    input: PreferenceAccessTokenInput;
    /** Access token */
    accessToken: string;
  }[] = [];

  await map(
    chunk(records, MAX_BATCH_SIZE),
    async (chunkedRecords) => {
      const tokens = await createPreferenceAccessTokensPage(
        client,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        chunkedRecords.map(({ index, ...rest }) => rest),
        logger,
      );
      const mappedResults = tokens.map((token, idx) => ({
        input: chunkedRecords[idx]!,
        accessToken: token,
      }));
      results.push(...mappedResults);
      completed += chunkedRecords.length;
      emitProgress?.(completed);
    },
    { concurrency },
  );

  return results;
}
