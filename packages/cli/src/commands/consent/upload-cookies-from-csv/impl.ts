import { ConsentTrackerStatus } from '@transcend-io/privacy-types';
import { buildTranscendGraphQLClient, syncCookies } from '@transcend-io/sdk';
import colors from 'colors';

import { CookieCsvInput } from '../../../codecs.js';
import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { mapCookieCsvRowsToInputs } from '../../../lib/consent-manager/mapConsentCsvRowsToInputs.js';
import { parseCsv } from '../../../lib/requests/readCsv.js';

export interface UploadCookiesFromCsvCommandFlags {
  auth: string;
  trackerStatus: ConsentTrackerStatus;
  file: string;
  transcendUrl: string;
}

export async function uploadCookiesFromCsv(
  this: LocalContext,
  { auth, trackerStatus, file, transcendUrl }: UploadCookiesFromCsvCommandFlags,
): Promise<void> {
  doneInputValidation(this.process);

  this.logger.info(colors.magenta(`Reading "${file}" from disk`));
  const cookieRows = parseCsv(this.fs.readFileSync(file, 'utf8'), CookieCsvInput);
  const cookieInputs = mapCookieCsvRowsToInputs(cookieRows, trackerStatus);
  const client = buildTranscendGraphQLClient(transcendUrl, auth);
  const syncedCookies = await syncCookies(client, cookieInputs, { logger: this.logger });

  if (!syncedCookies) {
    this.logger.error(
      colors.red('Encountered error(s) syncing cookies from CSV, see logs above for more info. '),
    );
    this.process.exit(1);
  }
}
