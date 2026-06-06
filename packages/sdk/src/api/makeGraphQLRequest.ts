import { sleepPromise, type Logger } from '@transcend-io/utils';
import type { GraphQLClient, RequestDocument, Variables } from 'graphql-request';

/** Logger that silently discards all messages */
export const NOOP_LOGGER: Logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};

const DEFAULT_MAX_RETRIES = 4;

const KNOWN_ERRORS = [
  'syntax error',
  'got invalid value',
  'Client error',
  'cannot affect row a second time',
  'GRAPHQL_VALIDATION_FAILED',
];

/**
 * Make a GraphQL request with retries
 *
 * @param client - GraphQL client
 * @param document - GraphQL document
 * @param options - Options including logger, variables, headers, and retry config
 * @returns Response
 */
export async function makeGraphQLRequest<T, V extends Variables = Variables>(
  client: GraphQLClient,
  document: RequestDocument,
  options: {
    /** GraphQL variables */
    variables?: V;
    /** Logger for retry/error messages */
    logger?: Logger;
    /** Additional request headers */
    requestHeaders?: Record<string, string> | string[][] | Headers;
    /** Max number of retry attempts (default 4) */
    maxRetries?: number;
  },
): Promise<T> {
  const {
    variables,
    logger = NOOP_LOGGER,
    requestHeaders,
    maxRetries = DEFAULT_MAX_RETRIES,
  } = options;

  let retryCount = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const result = await client.request(document, variables, requestHeaders);
      return result as T;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      if (err.message?.includes('API key is invalid')) {
        throw new Error(
          'API key is invalid. ' +
            'Please ensure that the key provided has the proper scope and is not expired, ' +
            'and that the transcendUrl corresponds to the correct backend for your organization.',
        );
      }

      if (KNOWN_ERRORS.some((msg) => err.message?.includes(msg))) {
        throw err;
      }

      if (err.message?.startsWith('Client error: Too many requests')) {
        const rateLimitResetAt = err.response?.headers?.get('x-ratelimit-reset');
        const sleepTime = rateLimitResetAt
          ? new Date(rateLimitResetAt).getTime() - new Date().getTime() + 100
          : 1000 * 10;
        logger.warn(`DETECTED RATE LIMIT: ${err.message}. Sleeping for ${sleepTime}ms`);
        await sleepPromise(sleepTime);
      }

      if (retryCount >= maxRetries) {
        throw err;
      }
      retryCount += 1;
      logger.warn(`Retrying failed request (${retryCount} / ${maxRetries}): ${err.message}`);
    }
  }
}
