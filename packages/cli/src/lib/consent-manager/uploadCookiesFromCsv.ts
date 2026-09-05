import { ConsentTrackerStatus } from '@transcend-io/privacy-types';
import { buildTranscendGraphQLClient, syncCookies } from '@transcend-io/sdk';
import colors from 'colors';

import { CookieCsvInput } from '../../codecs.js';
import { DEFAULT_TRANSCEND_API } from '../../constants.js';
import { logger } from '../../logger.js';
import { readCsv } from '../requests/readCsv.js';
import { mapCookieCsvRowsToInputs } from './mapConsentCsvRowsToInputs.js';

/**
 * Upload a set of cookies from CSV
 *
 * @param options - Options
 */
export async function uploadCookiesFromCsv({
  auth,
  trackerStatus,
  file,
  transcendUrl = DEFAULT_TRANSCEND_API,
}: {
  /** CSV file path */
  file: string;
  /** Transcend API key authentication */
  auth: string;
  /** Sombra API key authentication */
  trackerStatus: ConsentTrackerStatus;
  /** API URL for Transcend backend */
  transcendUrl?: string;
}): Promise<void> {
  // Build a GraphQL client
  const client = buildTranscendGraphQLClient(transcendUrl, auth);

  // Read from CSV the set of cookie inputs
  logger.info(colors.magenta(`Reading "${file}" from disk`));
  const cookieInputs = readCsv(file, CookieCsvInput);

  const validatedCookieInputs = mapCookieCsvRowsToInputs(cookieInputs, trackerStatus);

  // Upload the cookies into Transcend dashboard
  const syncedCookies = await syncCookies(client, validatedCookieInputs, { logger });

  // Log errors
  if (!syncedCookies) {
    logger.error(
      colors.red('Encountered error(s) syncing cookies from CSV, see logs above for more info. '),
    );
    process.exit(1);
  }
}
