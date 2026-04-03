import { RequestAction, RequestOrigin, RequestStatus } from '@transcend-io/privacy-types';
import { buildTranscendGraphQLClient, makeGraphQLRequest } from '@transcend-io/sdk';
import { map } from '@transcend-io/utils';
import colors from 'colors';

import { DEFAULT_TRANSCEND_API } from '../../constants.js';
import { logger } from '../../logger.js';
import {
  UPDATE_PRIVACY_REQUEST,
  fetchAllRequests,
  APPROVE_PRIVACY_REQUEST,
} from '../graphql/index.js';
import { withProgressBar } from '../helpers/index.js';

/**
 * Approve a set of privacy requests
 *
 * @param options - Options
 * @returns The number of requests approved
 */
export async function approvePrivacyRequests({
  requestActions,
  requestOrigins,
  auth,
  silentModeBefore,
  createdAtAfter,
  createdAtBefore,
  updatedAtBefore,
  updatedAtAfter,
  concurrency = 50,
  transcendUrl = DEFAULT_TRANSCEND_API,
}: {
  /** The request actions that should be restarted */
  requestActions: RequestAction[];
  /** The request origins that should be restarted */
  requestOrigins?: RequestOrigin[];
  /** Transcend API key authentication */
  auth: string;
  /** Concurrency limit for approving */
  concurrency?: number;
  /** Mark these requests as silent mode if they were created before this date */
  silentModeBefore?: Date;
  /** Filter for requests created before this date */
  createdAtBefore?: Date;
  /** Filter for requests created after this date */
  createdAtAfter?: Date;
  /** Filter for requests updated before this date */
  updatedAtBefore?: Date;
  /** Filter for requests updated after this date */
  updatedAtAfter?: Date;
  /** API URL for Transcend backend */
  transcendUrl?: string;
}): Promise<number> {
  const client = buildTranscendGraphQLClient(transcendUrl, auth);

  const t0 = new Date().getTime();

  const allRequests = await withProgressBar((bar) =>
    fetchAllRequests(client, {
      actions: requestActions,
      statuses: [RequestStatus.Approving],
      createdAtAfter,
      createdAtBefore,
      updatedAtBefore,
      updatedAtAfter,
      origins: requestOrigins,
      onProgress({ totalCount, fetchedCount }) {
        bar.start(totalCount);
        bar.update(fetchedCount);
      },
    }),
  );

  logger.info(colors.magenta(`Approving "${allRequests.length}" requests.`));

  let total = 0;
  let skipped = 0;
  await withProgressBar(async (bar) => {
    bar.start(allRequests.length);
    await map(
      allRequests,
      async (requestToApprove) => {
        if (silentModeBefore && new Date(silentModeBefore) > new Date(requestToApprove.createdAt)) {
          await makeGraphQLRequest(client, UPDATE_PRIVACY_REQUEST, {
            variables: {
              input: {
                id: requestToApprove.id,
                isSilent: true,
              },
            },
            logger,
          });
        }

        try {
          await makeGraphQLRequest(client, APPROVE_PRIVACY_REQUEST, {
            variables: { input: { requestId: requestToApprove.id } },
            logger,
          });
        } catch (err) {
          if (err.message.includes('Request must be in an approving state,')) {
            skipped += 1;
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
  if (skipped > 0) {
    logger.info(colors.yellow(`${skipped} requests were skipped.`));
  }
  logger.info(
    colors.green(`Successfully approved ${total} requests in "${totalTime / 1000}" seconds!`),
  );
  return allRequests.length;
}
