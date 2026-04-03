import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { RequestAction, RequestStatus } from '@transcend-io/privacy-types';
import {
  buildTranscendGraphQLClient,
  createSombraGotInstance,
  makeGraphQLRequest,
} from '@transcend-io/sdk';
import { map } from '@transcend-io/utils';
import colors from 'colors';

import { DEFAULT_TRANSCEND_API } from '../../constants.js';
import { logger } from '../../logger.js';
import { fetchAllRequests, APPROVE_PRIVACY_REQUEST } from '../graphql/index.js';
import { withProgressBar } from '../helpers/index.js';
import { getFileMetadataForPrivacyRequests } from './getFileMetadataForPrivacyRequests.js';
import { streamPrivacyRequestFiles } from './streamPrivacyRequestFiles.js';

/**
 * Download a set of privacy requests to disk
 *
 * @param options - Options
 * @returns The number of requests canceled
 */
export async function downloadPrivacyRequestFiles({
  auth,
  folderPath,
  requestIds,
  createdAtBefore,
  sombraAuth,
  createdAtAfter,
  updatedAtBefore,
  updatedAtAfter,
  statuses = [RequestStatus.Approving, RequestStatus.Downloadable],
  concurrency = 5,
  transcendUrl = DEFAULT_TRANSCEND_API,
  approveAfterDownload = false,
}: {
  /** The folder path to download the files to */
  folderPath: string;
  /** Transcend API key authentication */
  auth: string;
  /** Sombra API key authentication */
  sombraAuth?: string;
  /** Concurrency limit for approving */
  concurrency?: number;
  /** The request statuses to cancel */
  statuses?: RequestStatus[];
  /** The set of privacy requests to cancel */
  requestIds?: string[];
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
  /** When true, approve any requests in Transcend that are in status=APPROVING */
  approveAfterDownload?: boolean;
}): Promise<number> {
  // Find all requests made before createdAt that are in a removing data state
  const client = buildTranscendGraphQLClient(transcendUrl, auth);

  // Create sombra instance to communicate with
  const sombra = await createSombraGotInstance(transcendUrl, auth, {
    logger,
    sombraApiKey: sombraAuth,
    sombraUrl: process.env.SOMBRA_URL,
  });

  // Create the folder if it does not exist
  if (!existsSync(folderPath)) {
    mkdirSync(folderPath);
  }

  const allRequests = await withProgressBar((bar) =>
    fetchAllRequests(client, {
      actions: [RequestAction.Access],
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

  const requestFileMetadata = await getFileMetadataForPrivacyRequests(allRequests, {
    sombra,
    concurrency,
  });

  const t0 = new Date().getTime();
  let total = 0;
  let totalApproved = 0;

  await withProgressBar(async (bar) => {
    bar.start(allRequests.length);
    await map(
      requestFileMetadata,
      async ([request, metadata]) => {
        const requestFolder = join(folderPath, request.id);
        if (!existsSync(requestFolder)) {
          mkdirSync(requestFolder);
        }

        await streamPrivacyRequestFiles(metadata, {
          sombra,
          requestId: request.id,
          onFileDownloaded: (fil, stream) => {
            const filePath = join(requestFolder, fil.fileName);
            const folder = dirname(filePath);
            if (!existsSync(folder)) {
              mkdirSync(folder, { recursive: true });
            }
            writeFileSync(filePath, stream);
          },
        });

        if (approveAfterDownload && request.status === RequestStatus.Approving) {
          await makeGraphQLRequest(client, APPROVE_PRIVACY_REQUEST, {
            variables: { input: { requestId: request.id } },
            logger,
          });
          totalApproved += 1;
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
    colors.green(`Successfully downloaded ${total} requests in "${totalTime / 1000}" seconds!`),
  );
  if (totalApproved > 0) {
    logger.info(colors.green(`Approved ${totalApproved} requests in Transcend.`));
  }
  return allRequests.length;
}
