import { RequestAction } from '@transcend-io/privacy-types';
import { buildTranscendGraphQLClient, createSombraGotInstance } from '@transcend-io/sdk';
import { mapSeries } from '@transcend-io/utils';
import colors from 'colors';

import { DEFAULT_TRANSCEND_API } from '../../constants.js';
import { logger } from '../../logger.js';
import { fetchRequestDataSiloActiveCount } from '../graphql/index.js';
import { withProgressBar } from '../helpers/index.js';
import { pullCronPageOfIdentifiers, CronIdentifier } from './pullCronPageOfIdentifiers.js';

/**
 * A CSV formatted identifier
 */
export type CsvFormattedIdentifier = {
  [k in string]: string | null | boolean | number;
};

export interface CronIdentifierWithAction extends CronIdentifier {
  /** The request action that the identifier relates to */
  action: RequestAction;
}

/**
 * Pull the set of identifiers outstanding for a cron or AVC integration
 *
 * This function is designed to be used in a loop, and will call the onSave callback
 * with a chunk of identifiers when the savePageSize is reached.
 *
 * @param options - Options
 * @returns The identifiers and identifiers formatted for CSV
 */
export async function pullChunkedCustomSiloOutstandingIdentifiers({
  dataSiloId,
  auth,
  sombraAuth,
  actions,
  apiPageSize = 100,
  savePageSize = 1000,
  onSave,
  transcendUrl = DEFAULT_TRANSCEND_API,
  skipRequestCount = false,
}: {
  /** Transcend API key authentication */
  auth: string;
  /** Data Silo ID to pull down jobs for */
  dataSiloId: string;
  /** The request actions to fetch */
  actions: RequestAction[];
  /** How many identifiers to pull in a single call to the backend */
  apiPageSize: number;
  /** How many identifiers to save at a time (usually to a CSV file, should be a multiple of apiPageSize) */
  savePageSize: number;
  /** Callback function called when a chunk of identifiers is ready to be saved */
  onSave: (chunk: CsvFormattedIdentifier[]) => Promise<void>;
  /** API URL for Transcend backend */
  transcendUrl?: string;
  /** Sombra API key authentication */
  sombraAuth?: string;
  /** Skip request count */
  skipRequestCount?: boolean;
}): Promise<{
  /** Raw Identifiers */
  identifiers: CronIdentifierWithAction[];
}> {
  // Validate savePageSize
  if (savePageSize % apiPageSize !== 0) {
    throw new Error(
      `savePageSize must be a multiple of apiPageSize. savePageSize: ${savePageSize}, apiPageSize: ${apiPageSize}`,
    );
  }

  // Create sombra instance to communicate with
  const sombra = await createSombraGotInstance(transcendUrl, auth, {
    logger,
    sombraApiKey: sombraAuth,
    sombraUrl: process.env.SOMBRA_URL,
  });

  // Create GraphQL client to connect to Transcend backend
  const client = buildTranscendGraphQLClient(transcendUrl, auth);

  let totalRequestCount = 0;
  if (!skipRequestCount) {
    totalRequestCount = await fetchRequestDataSiloActiveCount(client, {
      dataSiloId,
    });
  }

  logger.info(
    colors.magenta(
      `Pulling ${skipRequestCount ? 'all' : totalRequestCount} outstanding request identifiers ` +
        `for data silo: "${dataSiloId}" for requests of types "${actions.join('", "')}"`,
    ),
  );

  const t0 = new Date().getTime();
  const foundRequestIds = new Set<string>();

  const identifiers: CronIdentifierWithAction[] = [];
  let currentChunk: CsvFormattedIdentifier[] = [];

  await withProgressBar(async (bar) => {
    if (!skipRequestCount) {
      bar.start(totalRequestCount);
    }
    await mapSeries(actions, async (action) => {
      let offset = 0;
      let shouldContinue = true;

      while (shouldContinue) {
        const pageIdentifiers = await pullCronPageOfIdentifiers(sombra, {
          dataSiloId,
          limit: apiPageSize,
          offset,
          requestType: action,
        });

        const identifiersWithAction: CronIdentifierWithAction[] = pageIdentifiers.map(
          (identifier) => {
            foundRequestIds.add(identifier.requestId);
            return {
              ...identifier,
              action,
            };
          },
        );

        const csvFormattedIdentifiers = identifiersWithAction.map(
          ({ attributes, ...identifier }) => ({
            ...identifier,
            ...attributes.reduce(
              (acc, val) =>
                Object.assign(acc, {
                  [val.key]: val.values.join(','),
                }),
              {},
            ),
          }),
        );

        identifiers.push(...identifiersWithAction);
        currentChunk.push(...csvFormattedIdentifiers);

        if (currentChunk.length >= savePageSize) {
          await onSave(currentChunk);
          currentChunk = [];
        }

        shouldContinue = pageIdentifiers.length === apiPageSize;
        offset += apiPageSize;
        if (!skipRequestCount) {
          bar.update(foundRequestIds.size);
        } else {
          logger.info(
            colors.magenta(
              `Pulled ${pageIdentifiers.length} outstanding identifiers for ${foundRequestIds.size} requests`,
            ),
          );
        }
      }
    });
  });

  if (currentChunk.length > 0) {
    await onSave(currentChunk);
  }

  const t1 = new Date().getTime();
  const totalTime = t1 - t0;

  logger.info(
    colors.green(
      `Successfully pulled ${identifiers.length} outstanding identifiers from ${
        foundRequestIds.size
      } requests in "${totalTime / 1000}" seconds!`,
    ),
  );

  return { identifiers };
}
