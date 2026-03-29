import { RequestAction, RequestStatus } from '@transcend-io/privacy-types';
import { buildTranscendGraphQLClient } from '@transcend-io/sdk';
import { map } from '@transcend-io/utils';
import cliProgress from 'cli-progress';
import colors from 'colors';

import { DEFAULT_TRANSCEND_API } from '../../constants.js';
import { logger } from '../../logger.js';
import {
  CHANGE_REQUEST_DATA_SILO_STATUS,
  makeGraphQLRequest,
  fetchRequestDataSilos,
  fetchRequestDataSilosCount,
  fetchRequestDataSilo,
  fetchAllRequests,
} from '../graphql/index.js';

/**
 * Given a data silo ID, mark all open request data silos as skipped.
 *
 * When requestActions are provided, only requests matching those actions
 * will have their data silo jobs skipped (follows the per-request lookup
 * pattern used by retryRequestDataSilos).
 *
 * @param options - Options
 * @returns Number of items skipped
 */
export async function skipRequestDataSilos({
  dataSiloId,
  auth,
  concurrency = 50,
  maxUploadPerChunk = 50000,
  status = 'SKIPPED',
  transcendUrl = DEFAULT_TRANSCEND_API,
  requestStatuses = [RequestStatus.Compiling, RequestStatus.Secondary],
  requestActions,
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
  /** Maximum number of items to mark skipped per go */
  maxUploadPerChunk?: number;
  /** When provided, only skip data silo jobs for requests matching these actions */
  requestActions?: RequestAction[];
}): Promise<number> {
  const client = buildTranscendGraphQLClient(transcendUrl, auth);
  const t0 = new Date().getTime();

  if (requestActions && requestActions.length > 0) {
    return skipRequestDataSilosByAction({
      client,
      dataSiloId,
      status,
      concurrency,
      requestActions,
      requestStatuses,
      t0,
    });
  }

  // Determine total number of request data silos
  const requestDataSiloCount = await fetchRequestDataSilosCount(client, {
    dataSiloId,
    requestStatuses,
  });

  logger.info(colors.magenta(`Marking ${requestDataSiloCount} request data silos as completed`));

  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

  let total = 0;
  progressBar.start(requestDataSiloCount, 0);

  // fetch all RequestDataSilos that are open
  while (total < requestDataSiloCount) {
    const requestDataSilos = await fetchRequestDataSilos(client, {
      dataSiloId,
      requestStatuses,
      limit: maxUploadPerChunk,
      // eslint-disable-next-line no-loop-func
      onProgress: (numUpdated) => {
        total += numUpdated / 2;
        progressBar.update(total);
      },
    });

    await map(
      requestDataSilos,
      // eslint-disable-next-line no-loop-func
      async (requestDataSilo) => {
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

        total += 0.5;
        progressBar.update(total);
      },
      { concurrency },
    );
  }

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

/**
 * Skip request data silos filtered by request action. Fetches all requests
 * matching the given actions/statuses, then looks up and skips the
 * corresponding RequestDataSilo for each.
 */
async function skipRequestDataSilosByAction({
  client,
  dataSiloId,
  status,
  concurrency,
  requestActions,
  requestStatuses,
  t0,
}: {
  /** GraphQL client */
  client: import('graphql-request').GraphQLClient;
  /** Data Silo ID */
  dataSiloId: string;
  /** Status to set */
  status: 'SKIPPED' | 'RESOLVED';
  /** Concurrency */
  concurrency: number;
  /** Request actions to filter on */
  requestActions: RequestAction[];
  /** Request statuses to filter on */
  requestStatuses: RequestStatus[];
  /** Start timestamp for timing */
  t0: number;
}): Promise<number> {
  const allRequests = await fetchAllRequests(client, {
    actions: requestActions,
    statuses: requestStatuses,
  });

  logger.info(
    colors.magenta(
      `Skipping data silo jobs for "${dataSiloId}" across ${allRequests.length} ` +
        `requests matching actions: ${requestActions.join(', ')}`,
    ),
  );

  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  let total = 0;
  let skipped = 0;
  progressBar.start(allRequests.length, 0);

  await map(
    allRequests,
    async (request) => {
      try {
        const requestDataSilo = await fetchRequestDataSilo(client, {
          requestId: request.id,
          dataSiloId,
        });

        await makeGraphQLRequest<{
          /** Whether we successfully uploaded the results */
          success: boolean;
        }>(client, CHANGE_REQUEST_DATA_SILO_STATUS, {
          variables: { requestDataSiloId: requestDataSilo.id, status },
          logger,
        });
      } catch (err) {
        if (err.message.includes('Failed to find RequestDataSilo')) {
          skipped += 1;
        } else if (!err.message.includes('Client error: Request must be active:')) {
          throw err;
        }
      }

      total += 1;
      progressBar.update(total);
    },
    { concurrency },
  );

  progressBar.stop();
  const t1 = new Date().getTime();
  const totalTime = t1 - t0;

  logger.info(
    colors.green(
      `Successfully skipped data silo jobs for ${total} requests in "${totalTime / 1000}" seconds` +
        `${skipped > 0 ? `, ${skipped} requests skipped (data silo not attached)` : ''}!`,
    ),
  );
  return allRequests.length;
}
