import { RequestDataSiloStatus } from '@transcend-io/privacy-types';
import {
  buildTranscendGraphQLClient,
  makeGraphQLRequest,
  CHANGE_REQUEST_DATA_SILO_STATUS,
  fetchRequestDataSilo,
} from '@transcend-io/sdk';
import { map } from '@transcend-io/utils';
import colors from 'colors';

import { DEFAULT_TRANSCEND_API } from '../../constants.js';
import { logger } from '../../logger.js';
import { withProgressBar } from '../helpers/index.js';

/**
 * Given a CSV of Request IDs, mark associated RequestDataSilos as completed
 *
 * @param options - Options
 * @returns Number of items marked as completed
 */
export async function markRequestDataSiloIdsCompleted({
  requestIds,
  dataSiloId,
  auth,
  concurrency = 100,
  status = RequestDataSiloStatus.Resolved,
  transcendUrl = DEFAULT_TRANSCEND_API,
}: {
  /** The list of request ids to mark as completed  */
  requestIds: string[];
  /** Transcend API key authentication */
  auth: string;
  /** Data Silo ID to pull down jobs for */
  dataSiloId: string;
  /** Status to update requests to */
  status?: RequestDataSiloStatus;
  /** Upload concurrency */
  concurrency?: number;
  /** API URL for Transcend backend */
  transcendUrl?: string;
}): Promise<number> {
  // Find all requests made before createdAt that are in a removing data state
  const client = buildTranscendGraphQLClient(transcendUrl, auth);

  const t0 = new Date().getTime();

  logger.info(
    colors.magenta(
      `Notifying Transcend for data silo "${dataSiloId}" marking "${requestIds.length}" requests as completed.`,
    ),
  );

  let total = 0;
  await withProgressBar(async (bar) => {
    bar.start(requestIds.length);
    await map(
      requestIds,
      async (requestId) => {
        const requestDataSilo = await fetchRequestDataSilo(
          client,
          {
            requestId,
            dataSiloId,
          },
          { logger },
        );

        try {
          await makeGraphQLRequest<{
            /** Whether we successfully uploaded the results */
            success: boolean;
          }>(client, CHANGE_REQUEST_DATA_SILO_STATUS, {
            variables: {
              requestDataSiloId: requestDataSilo.id,
              status,
            },
            logger,
          });
        } catch (err) {
          if (
            !err.message.includes('Client error: Request must be active:') &&
            !err.message.includes('Failed to find RequestDataSilo')
          ) {
            throw err;
          }
        }

        total += 1;
        bar.update(total);
      },
      { concurrency },
    );
  });

  const t1 = new Date().getTime();
  const totalTime = t1 - t0;

  logger.info(colors.green(`Successfully notified Transcend in "${totalTime / 1000}" seconds!`));
  return requestIds.length;
}
