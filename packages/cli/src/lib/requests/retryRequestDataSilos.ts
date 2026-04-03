import { RequestAction, RequestStatus } from '@transcend-io/privacy-types';
import {
  buildTranscendGraphQLClient,
  makeGraphQLRequest,
  RETRY_REQUEST_DATA_SILO,
  fetchRequestDataSilo,
} from '@transcend-io/sdk';
import { map } from '@transcend-io/utils';
import colors from 'colors';

import { DEFAULT_TRANSCEND_API } from '../../constants.js';
import { logger } from '../../logger.js';
import { fetchAllRequests } from '../graphql/index.js';
import { withProgressBar } from '../helpers/index.js';

/**
 * Retry a set of RequestDataSilos
 *
 * @param options - Options
 * @returns Number of items marked as completed
 */
export async function retryRequestDataSilos({
  requestActions,
  dataSiloId,
  auth,
  concurrency = 20,
  transcendUrl = DEFAULT_TRANSCEND_API,
}: {
  /** The request actions that should be restarted */
  requestActions: RequestAction[];
  /** Transcend API key authentication */
  auth: string;
  /** Data Silo ID to pull down jobs for */
  dataSiloId: string;
  /** Concurrency to upload requests in parallel */
  concurrency?: number;
  /** API URL for Transcend backend */
  transcendUrl?: string;
}): Promise<number> {
  const client = buildTranscendGraphQLClient(transcendUrl, auth);

  const t0 = new Date().getTime();

  const allRequests = await withProgressBar((bar) =>
    fetchAllRequests(client, {
      actions: requestActions,
      statuses: [RequestStatus.Compiling, RequestStatus.Approving],
      onProgress({ totalCount, fetchedCount }) {
        bar.start(totalCount);
        bar.update(fetchedCount);
      },
    }),
  );

  logger.info(
    colors.magenta(
      `Retrying requests for Data Silo: "${dataSiloId}", restarting "${allRequests.length}" requests.`,
    ),
  );

  let total = 0;
  let skipped = 0;
  await withProgressBar(async (bar) => {
    bar.start(allRequests.length);
    await map(
      allRequests,
      async (requestToRestart) => {
        try {
          const requestDataSilo = await fetchRequestDataSilo(
            client,
            {
              requestId: requestToRestart.id,
              dataSiloId,
            },
            { logger },
          );

          await makeGraphQLRequest<{
            /** Whether we successfully uploaded the results */
            success: boolean;
          }>(client, RETRY_REQUEST_DATA_SILO, {
            variables: { requestDataSiloId: requestDataSilo.id },
            logger,
          });
        } catch (err) {
          if (!err.message.includes('Failed to find RequestDataSilo')) {
            throw err;
          }
          skipped += 1;
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
      `Successfully notified Transcend in "${
        totalTime / 1000
      }" seconds for ${total} requests, ${skipped} requests were skipped because data silo was not attached to the request!`,
    ),
  );
  return allRequests.length;
}
