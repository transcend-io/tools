import { ConsentTrackerStatus } from '@transcend-io/privacy-types';
import { buildTranscendGraphQLClient, syncDataFlows } from '@transcend-io/sdk';
import colors from 'colors';

import { DataFlowCsvInput } from '../../codecs.js';
import { DEFAULT_TRANSCEND_API } from '../../constants.js';
import { logger } from '../../logger.js';
import { readCsv } from '../requests/readCsv.js';
import { mapDataFlowCsvRowsToInputs } from './mapConsentCsvRowsToInputs.js';

/**
 * Upload a set of data flows from CSV
 *
 * @param options - Options
 */
export async function uploadDataFlowsFromCsv({
  auth,
  trackerStatus,
  file,
  classifyService = false,
  transcendUrl = DEFAULT_TRANSCEND_API,
}: {
  /** CSV file path */
  file: string;
  /** Transcend API key authentication */
  auth: string;
  /** Sombra API key authentication */
  trackerStatus: ConsentTrackerStatus;
  /** classify data flow service if missing */
  classifyService?: boolean;
  /** API URL for Transcend backend */
  transcendUrl?: string;
}): Promise<void> {
  // Build a GraphQL client
  const client = buildTranscendGraphQLClient(transcendUrl, auth);

  // Read from CSV the set of data flow inputs
  logger.info(colors.magenta(`Reading "${file}" from disk`));
  const dataFlowInputs = readCsv(file, DataFlowCsvInput);

  const validatedDataFlowInputs = mapDataFlowCsvRowsToInputs(dataFlowInputs, trackerStatus);

  // Upload the data flows into Transcend dashboard
  const syncedDataFlows = await syncDataFlows(client, validatedDataFlowInputs, {
    classifyService,
    logger,
  });

  // Log errors
  if (!syncedDataFlows) {
    logger.error(
      colors.red(
        'Encountered error(s) syncing data flows from CSV, see logs above for more info. ',
      ),
    );
    process.exit(1);
  }
}
