import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { RequestAction, RequestStatus } from '@transcend-io/privacy-types';
import {
  buildTranscendGraphQLClient,
  createSombraGotInstance,
  makeGraphQLRequest,
} from '@transcend-io/sdk';
import { map } from '@transcend-io/utils';
import cliProgress from 'cli-progress';
import colors from 'colors';

import { DEFAULT_TRANSCEND_API } from '../../constants.js';
import type { CliLogger } from '../../context.js';
import { logger } from '../../logger.js';
import { fetchAllRequests, APPROVE_PRIVACY_REQUEST } from '../graphql/index.js';
import { getFileMetadataForPrivacyRequests } from './getFileMetadataForPrivacyRequests.js';
import { streamPrivacyRequestFiles } from './streamPrivacyRequestFiles.js';

/** Runtime dependencies used while downloading privacy request files. */
export interface DownloadPrivacyRequestFilesDependencies {
  /** Filesystem implementation used to create folders and write files. */
  readonly fs: typeof fs;
  /** Logger used for progress and SDK output. */
  readonly logger: CliLogger;
  /** Path implementation used to construct download paths. */
  readonly path: typeof path;
  /** Process implementation used for environment access. */
  readonly process: NodeJS.Process;
}

const defaultDependencies: DownloadPrivacyRequestFilesDependencies = {
  fs,
  logger,
  path,
  process,
};

/**
 * Download a set of privacy requests to disk
 *
 * @param options - Options
 * @param dependencies - Runtime dependencies.
 * @returns The number of requests canceled
 */
export async function downloadPrivacyRequestFiles(
  {
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
  },
  dependencies: DownloadPrivacyRequestFilesDependencies = defaultDependencies,
): Promise<number> {
  // Find all requests made before createdAt that are in a removing data state
  const client = buildTranscendGraphQLClient(transcendUrl, auth);

  // Create sombra instance to communicate with
  const sombra = await createSombraGotInstance(transcendUrl, auth, {
    logger: dependencies.logger,
    sombraApiKey: sombraAuth,
    sombraUrl: dependencies.process.env.SOMBRA_URL,
  });

  // Create the folder if it does not exist
  if (!dependencies.fs.existsSync(folderPath)) {
    dependencies.fs.mkdirSync(folderPath);
  }

  // Pull in the requests
  const allRequests = await fetchAllRequests(
    client,
    {
      actions: [RequestAction.Access],
      createdAtBefore,
      createdAtAfter,
      updatedAtBefore,
      updatedAtAfter,
      statuses,
      requestIds,
    },
    { logger: dependencies.logger },
  );

  // Download the file metadata for each request
  const requestFileMetadata = await getFileMetadataForPrivacyRequests(
    allRequests,
    {
      sombra,
      concurrency,
    },
    { logger: dependencies.logger },
  );

  // Start timer for download process
  const t0 = new Date().getTime();
  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  let total = 0;
  let totalApproved = 0;
  progressBar.start(allRequests.length, 0);

  // Download the files for each request
  await map(
    requestFileMetadata,
    async ([request, metadata]) => {
      // Create a new folder to store request files
      const requestFolder = dependencies.path.join(folderPath, request.id);
      if (!dependencies.fs.existsSync(requestFolder)) {
        dependencies.fs.mkdirSync(requestFolder);
      }

      // Stream each file to disk
      await streamPrivacyRequestFiles(
        metadata,
        {
          sombra,
          requestId: request.id,
          onFileDownloaded: (fil, stream) => {
            // Ensure a folder exists for the file
            // filename looks like Health/heartbeat.csv
            const filePath = dependencies.path.join(requestFolder, fil.fileName);
            const folder = dependencies.path.dirname(filePath);
            if (!dependencies.fs.existsSync(folder)) {
              dependencies.fs.mkdirSync(folder, { recursive: true });
            }

            // Write to disk
            dependencies.fs.writeFileSync(filePath, stream);
          },
        },
        { logger: dependencies.logger },
      );

      // Approve the request if requested
      if (approveAfterDownload && request.status === RequestStatus.Approving) {
        await makeGraphQLRequest(client, APPROVE_PRIVACY_REQUEST, {
          variables: { input: { requestId: request.id } },
          logger: dependencies.logger,
        });
        totalApproved += 1;
      }

      // Increment the progress bar
      total += 1;
      progressBar.update(total);
    },
    { concurrency },
  );

  progressBar.stop();
  const t1 = new Date().getTime();
  const totalTime = t1 - t0;

  dependencies.logger.info(
    colors.green(`Successfully downloaded ${total} requests in "${totalTime / 1000}" seconds!`),
  );
  if (totalApproved > 0) {
    dependencies.logger.info(colors.green(`Approved ${totalApproved} requests in Transcend.`));
  }
  return allRequests.length;
}
