import { map } from '@transcend-io/utils';
import colors from 'colors';
import type { Got } from 'got';

import type { CliLogger } from '../../context.js';
import { logger } from '../../logger.js';
import { RequestFileMetadata } from './getFileMetadataForPrivacyRequests.js';

/** Runtime dependencies used while streaming privacy request files. */
export interface StreamPrivacyRequestFilesDependencies {
  /** Logger used to report skipped downloads. */
  readonly logger: CliLogger;
}

const defaultDependencies: StreamPrivacyRequestFilesDependencies = {
  logger,
};

/**
 * This function will take in a set of file metadata for privacy requests
 * call the Transcend API to stream the file metadata for these requests
 * and pass that through a callback function
 *
 * @param fileMetadata - Metadata to download
 * @param options - Options for the request
 * @param dependencies - Runtime dependencies.
 */
export async function streamPrivacyRequestFiles(
  fileMetadata: RequestFileMetadata[],
  {
    requestId,
    sombra,
    onFileDownloaded,
    concurrency = 20,
  }: {
    /** Request ID for logging */
    requestId: string;
    /** Sombra got instance */
    sombra: Got;
    /** Handler on each file */
    onFileDownloaded: (metadata: RequestFileMetadata, stream: Uint8Array) => void;
    /** Concurrent downloads at once */
    concurrency?: number;
  },
  dependencies: StreamPrivacyRequestFilesDependencies = defaultDependencies,
): Promise<void> {
  // Loop over each file
  await map(
    fileMetadata,
    async (metadata) => {
      try {
        // Construct the stream
        await sombra
          .get('v1/files', {
            searchParams: {
              downloadKey: metadata.downloadKey,
            },
          })
          .buffer()
          .then((fileResponse) => onFileDownloaded(metadata, fileResponse));
      } catch (err) {
        if (err?.response?.body?.includes('fileMetadata#verify')) {
          dependencies.logger.error(
            colors.red(
              `Failed to pull file for: ${metadata.fileName} (request:${requestId}) - JWT expired. ` +
                'This likely means that the file is no longer available. ' +
                'Try restarting the request from scratch in Transcend Admin Dashboard. ' +
                'Skipping the download of this file.',
            ),
          );
          return;
        }
        throw new Error(`Received an error from server: ${err?.response?.body || err?.message}`);
      }
    },
    {
      concurrency,
    },
  );
}
