import { RequestAction, RequestStatus } from '@transcend-io/privacy-types';
import {
  buildTranscendGraphQLClient,
  makeGraphQLRequest,
  CHANGE_REQUEST_DATA_SILO_STATUS,
  fetchRequestDataSilos,
  fetchRequestDataSilosCount,
} from '@transcend-io/sdk';
import { map } from '@transcend-io/utils';
import cliProgress from 'cli-progress';
import colors from 'colors';

import { DEFAULT_TRANSCEND_API } from '../../constants.js';
import { logger } from '../../logger.js';

/**
 * Given a data silo ID, mark all open request data silos as skipped
 *
 * @param options - Options
 * @returns Number of items skipped
 */
export async function skipRequestDataSilos({
  dataSiloId,
  auth,
  concurrency = 50,
  status = 'SKIPPED',
  transcendUrl = DEFAULT_TRANSCEND_API,
  requestStatuses = [RequestStatus.Compiling, RequestStatus.Secondary],
  actionTypes = [],
}: {
  /** Transcend API key authentication */
  auth: string;
  /** Data Silo ID to pull down jobs for */
  dataSiloId: string;
  /** Status to set */
  status?: 'SKIPPED' | 'RESOLVED';
  /** Upload concurrency */
  concurrency?: number;
  /** API URL for Transcend backend */
  transcendUrl?: string;
  /** Request statuses to mark as completed */
  requestStatuses?: RequestStatus[];
  /** Request action types to filter on */
  actionTypes?: RequestAction[];
}): Promise<number> {
  // Find all requests made before createdAt that are in a removing data state
  const client = buildTranscendGraphQLClient(transcendUrl, auth);

  // Time duration
  const t0 = new Date().getTime();

  // Determine total number of request data silos
  const requestDataSiloCount = await fetchRequestDataSilosCount(
    client,
    {
      dataSiloId,
      requestStatuses,
    },
    { logger },
  );
  logger.info(
    colors.magenta(
      `Marking ${requestDataSiloCount} request data silos as completed${actionTypes.length > 0 ? ` for action types: ${actionTypes.join(',')}` : ''}`,
    ),
  );

  // create a new progress bar instance and use shades_classic theme
  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

  let total = 0;
  progressBar.start(requestDataSiloCount, 0);

  // Fetch all matching request data silos, updating progress as pages are fetched
  const requestDataSilos = await fetchRequestDataSilos(
    client,
    {
      dataSiloId,
      requestStatuses,
      onProgress: (numFetched) => {
        total += numFetched / 2;
        progressBar.update(total);
      },
    },
    { logger },
  );

  await map(
    requestDataSilos,
    async (requestDataSilo) => {
      if (actionTypes.length === 0 || actionTypes.includes(requestDataSilo.request.type)) {
        try {
          await makeGraphQLRequest<{
            /** Whether we successfully uploaded the results */
            success: boolean;
          }>(client, CHANGE_REQUEST_DATA_SILO_STATUS, {
            variables: { requestDataSiloId: requestDataSilo.id, status },
            logger,
          });
        } catch (err) {
          if (!err.message.includes('Client error: Request must be active:')) {
            throw err;
          }
        }
      }

      total += 0.5;
      progressBar.update(total);
    },
    { concurrency },
  );

  progressBar.stop();
  const t1 = new Date().getTime();
  const totalTime = t1 - t0;

  logger.info(
    colors.green(
      `Successfully skipped "${requestDataSiloCount}" requests in "${totalTime / 1000}" seconds!`,
    ),
  );
  return requestDataSiloCount;
}
