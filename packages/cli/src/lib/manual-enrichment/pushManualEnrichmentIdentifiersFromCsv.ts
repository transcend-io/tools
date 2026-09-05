import fs from 'node:fs';
import process from 'node:process';

import {
  buildTranscendGraphQLClient,
  createSombraGotInstance,
  makeGraphQLRequest,
} from '@transcend-io/sdk';
import { map } from '@transcend-io/utils';
import colors from 'colors';

import { DEFAULT_TRANSCEND_API } from '../../constants.js';
import type { CliLogger } from '../../context.js';
import { logger } from '../../logger.js';
import { UPDATE_PRIVACY_REQUEST } from '../graphql/index.js';
import { readCsv } from '../requests/index.js';
import { enrichPrivacyRequest, EnrichPrivacyRequest } from './enrichPrivacyRequest.js';

/** Runtime dependencies used while pushing manual enrichment identifiers. */
export interface PushManualEnrichmentIdentifiersFromCsvDependencies {
  /** Filesystem implementation used to read the source CSV. */
  readonly fs: typeof fs;
  /** Logger used for progress, success, and error output. */
  readonly logger: CliLogger;
  /** Process implementation used for environment access. */
  readonly process: NodeJS.Process;
}

const defaultDependencies: PushManualEnrichmentIdentifiersFromCsvDependencies = {
  fs,
  logger,
  process,
};

/**
 * Push a CSV of enriched requests back into Transcend
 *
 * @param options - Options
 * @param dependencies - Runtime dependencies.
 * @returns Number of items processed
 */
export async function pushManualEnrichmentIdentifiersFromCsv(
  {
    file,
    auth,
    sombraAuth,
    enricherId,
    markSilent,
    concurrency = 100,
    transcendUrl = DEFAULT_TRANSCEND_API,
  }: {
    /** CSV file path */
    file: string;
    /** Transcend API key authentication */
    auth: string;
    /** ID of enricher being uploaded to */
    enricherId: string;
    /** Sombra API key authentication */
    sombraAuth?: string;
    /** Concurrency */
    concurrency?: number;
    /** API URL for Transcend backend */
    transcendUrl?: string;
    /** Mark requests in silent mode before enriching */
    markSilent?: boolean;
  },
  dependencies: PushManualEnrichmentIdentifiersFromCsvDependencies = defaultDependencies,
): Promise<number> {
  // Create sombra instance to communicate with
  const sombra = await createSombraGotInstance(transcendUrl, auth, {
    logger: dependencies.logger,
    sombraApiKey: sombraAuth,
    sombraUrl: dependencies.process.env.SOMBRA_URL,
  });
  const client = buildTranscendGraphQLClient(transcendUrl, auth);

  // Read from CSV
  dependencies.logger.info(colors.magenta(`Reading "${file}" from disk`));
  const activeResults = readCsv(file, EnrichPrivacyRequest, undefined, {
    fs: dependencies.fs,
  });

  // Notify Transcend
  dependencies.logger.info(colors.magenta(`Enriching "${activeResults.length}" privacy requests.`));

  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  await map(
    activeResults,
    async (request, index) => {
      try {
        // Mark requests in silent mode before a certain date
        if (markSilent) {
          await makeGraphQLRequest(client, UPDATE_PRIVACY_REQUEST, {
            variables: {
              input: {
                id: request.id,
                isSilent: true,
              },
            },
            logger: dependencies.logger,
          });

          dependencies.logger.info(colors.magenta(`Mark request as silent mode - ${request.id}`));
        }

        const result = await enrichPrivacyRequest(sombra, request, enricherId, index, {
          logger: dependencies.logger,
        });
        if (result) {
          successCount += 1;
        } else {
          skippedCount += 1;
        }
      } catch {
        errorCount += 1;
      }
    },
    { concurrency },
  );

  dependencies.logger.info(
    colors.green(`Successfully notified Transcend! \n Success count: ${successCount}.`),
  );

  if (skippedCount > 0) {
    dependencies.logger.info(colors.magenta(`Skipped count: ${skippedCount}.`));
  }

  if (errorCount > 0) {
    dependencies.logger.info(colors.red(`Error Count: ${errorCount}.`));
    throw new Error(`Failed to enrich: ${errorCount} requests.`);
  }

  return activeResults.length;
}
