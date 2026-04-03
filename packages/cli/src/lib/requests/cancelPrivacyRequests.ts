import { RequestAction, RequestStatus } from '@transcend-io/privacy-types';
import {
  buildTranscendGraphQLClient,
  fetchAllTemplates,
  makeGraphQLRequest,
  type Template,
} from '@transcend-io/sdk';
import { map } from '@transcend-io/utils';
import colors from 'colors';

import { DEFAULT_TRANSCEND_API } from '../../constants.js';
import { logger } from '../../logger.js';
import {
  UPDATE_PRIVACY_REQUEST,
  fetchAllRequests,
  CANCEL_PRIVACY_REQUEST,
} from '../graphql/index.js';
import { withProgressBar } from '../helpers/index.js';

/**
 * Cancel a set of privacy requests
 *
 * @param options - Options
 * @returns The number of requests canceled
 */
export async function cancelPrivacyRequests({
  requestActions,
  cancellationTitle,
  auth,
  requestIds,
  silentModeBefore,
  createdAtBefore,
  createdAtAfter,
  updatedAtBefore,
  updatedAtAfter,
  statuses = [
    RequestStatus.Compiling,
    RequestStatus.RequestMade,
    RequestStatus.Delayed,
    RequestStatus.Approving,
    RequestStatus.Secondary,
    RequestStatus.Enriching,
    RequestStatus.Waiting,
    RequestStatus.SecondaryApproving,
  ],
  concurrency = 50,
  transcendUrl = DEFAULT_TRANSCEND_API,
}: {
  /** The request actions that should be restarted */
  requestActions: RequestAction[];
  /** Transcend API key authentication */
  auth: string;
  /** Concurrency limit for approving */
  concurrency?: number;
  /** The request statuses to cancel */
  statuses?: RequestStatus[];
  /** The set of privacy requests to cancel */
  requestIds?: string[];
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
  /** The email template to use when canceling the requests */
  cancellationTitle?: string;
}): Promise<number> {
  const client = buildTranscendGraphQLClient(transcendUrl, auth);

  const t0 = new Date().getTime();

  let cancelationTemplate: Template | undefined;
  if (cancellationTitle) {
    const matchingTemplates = await fetchAllTemplates(client, {
      title: cancellationTitle,
      logger,
    });
    const exactTitleMatch = matchingTemplates.find(
      (template) => template.title === cancellationTitle,
    );
    if (!exactTitleMatch) {
      throw new Error(`Failed to find a template with title: "${cancellationTitle}"`);
    }
    cancelationTemplate = exactTitleMatch;
  }

  const allRequests = await withProgressBar((bar) =>
    fetchAllRequests(client, {
      actions: requestActions,
      createdAtBefore,
      createdAtAfter,
      updatedAtBefore,
      updatedAtAfter,
      statuses,
      requestIds,
      onProgress({ totalCount, fetchedCount }) {
        bar.start(totalCount);
        bar.update(fetchedCount);
      },
    }),
  );

  logger.info(
    colors.magenta(
      `Canceling "${allRequests.length}" requests${
        cancelationTemplate ? ` Using template: ${cancelationTemplate.title}` : ''
      }.`,
    ),
  );

  let total = 0;
  await withProgressBar(async (bar) => {
    bar.start(allRequests.length);
    await map(
      allRequests,
      async (requestToCancel) => {
        if (silentModeBefore && new Date(silentModeBefore) > new Date(requestToCancel.createdAt)) {
          await makeGraphQLRequest(client, UPDATE_PRIVACY_REQUEST, {
            variables: {
              input: {
                id: requestToCancel.id,
                isSilent: true,
              },
            },
            logger,
          });
        }

        await makeGraphQLRequest(client, CANCEL_PRIVACY_REQUEST, {
          variables: {
            input: {
              requestId: requestToCancel.id,
              ...(cancelationTemplate
                ? {
                    subject: `Re: ${cancelationTemplate.subject.defaultMessage}`,
                    template: cancelationTemplate.template.defaultMessage,
                  }
                : {}),
            },
          },
          logger,
        });

        total += 1;
        bar.update(total);
      },
      { concurrency },
    );
  });

  const t1 = new Date().getTime();
  const totalTime = t1 - t0;

  logger.info(
    colors.green(`Successfully canceled ${total} requests in "${totalTime / 1000}" seconds!`),
  );
  return allRequests.length;
}
