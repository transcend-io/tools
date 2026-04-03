import { RequestAction, RequestStatus } from '@transcend-io/privacy-types';
import {
  buildTranscendGraphQLClient,
  fetchAllRequests,
  makeGraphQLRequest,
} from '@transcend-io/sdk';
import { map } from '@transcend-io/utils';
import colors from 'colors';

import { DEFAULT_TRANSCEND_API } from '../../constants.js';
import { logger } from '../../logger.js';
import { REMOVE_REQUEST_IDENTIFIERS, fetchAllRequestIdentifierMetadata } from '../graphql/index.js';
import { withProgressBar } from '../helpers/index.js';

/**
 * Remove a set of unverified request identifier
 *
 * @param options - Options
 * @returns Number of items marked as completed
 */
export async function removeUnverifiedRequestIdentifiers({
  requestActions,
  identifierNames,
  auth,
  concurrency = 20,
  transcendUrl = DEFAULT_TRANSCEND_API,
}: {
  /** The request actions that should be restarted */
  requestActions: RequestAction[];
  /** Transcend API key authentication */
  auth: string;
  /** The set of identifier names to remove */
  identifierNames: string[];
  /** Concurrency to upload requests in parallel */
  concurrency?: number;
  /** API URL for Transcend backend */
  transcendUrl?: string;
}): Promise<number> {
  // Find all requests made before createdAt that are in a removing data state
  const client = buildTranscendGraphQLClient(transcendUrl, auth);

  // Time duration
  const t0 = new Date().getTime();
  // Pull in the requests
  const allRequests = await withProgressBar((bar) =>
    fetchAllRequests(
      client,
      {
        actions: requestActions,
        statuses: [RequestStatus.Enriching],
        onProgress({ totalCount, fetchedCount }) {
          bar.start(totalCount);
          bar.update(fetchedCount);
        },
      },
      { logger },
    ),
  );

  // Notify Transcend
  logger.info(colors.magenta('Fetched requests in preflight/enriching state.'));

  let total = 0;
  let processed = 0;
  await withProgressBar(async (bar) => {
    bar.start(allRequests.length);
    await map(
      allRequests,
      async (requestToRestart) => {
        const requestIdentifiers = await fetchAllRequestIdentifierMetadata(client, {
          requestId: requestToRestart.id,
        });
        const clearOut = requestIdentifiers
          .filter(
            ({ isVerifiedAtLeastOnce, name }) =>
              isVerifiedAtLeastOnce === false && identifierNames.includes(name),
          )
          .map(({ id }) => id);

        if (clearOut.length > 0) {
          await makeGraphQLRequest<{
            /** Whether we successfully uploaded the results */
            success: boolean;
          }>(client, REMOVE_REQUEST_IDENTIFIERS, {
            variables: {
              input: {
                requestId: requestToRestart.id,
                requestIdentifierIds: clearOut,
              },
            },
            logger,
          });
          processed += clearOut.length;
        }

        total += 1;
        bar.update(total);
      },
      { concurrency },
    );
  });
  const t1 = new Date().getTime();
  const totalTime = t1 - t0;

  logger.info(
    colors.green(
      `Successfully cleared out unverified identifiers "${
        totalTime / 1000
      }" seconds for ${total} requests, ${processed} identifiers were cleared out!`,
    ),
  );
  return allRequests.length;
}
