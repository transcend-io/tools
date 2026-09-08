import { ConsentTrackerStatus } from '@transcend-io/privacy-types';
import { buildTranscendGraphQLClient, syncDataFlows } from '@transcend-io/sdk';
import colors from 'colors';

import { DataFlowCsvInput } from '../../../codecs.js';
import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { mapDataFlowCsvRowsToInputs } from '../../../lib/consent-manager/mapConsentCsvRowsToInputs.js';
import { parseCsv } from '../../../lib/requests/readCsv.js';

export interface UploadDataFlowsFromCsvCommandFlags {
  auth: string;
  trackerStatus: ConsentTrackerStatus;
  file: string;
  classifyService: boolean;
  transcendUrl: string;
}

export async function uploadDataFlowsFromCsv(
  this: LocalContext,
  { auth, trackerStatus, file, classifyService, transcendUrl }: UploadDataFlowsFromCsvCommandFlags,
): Promise<void> {
  doneInputValidation(this.process);

  this.logger.info(colors.magenta(`Reading "${file}" from disk`));
  const dataFlowRows = parseCsv(this.fs.readFileSync(file, 'utf8'), DataFlowCsvInput);
  const dataFlowInputs = mapDataFlowCsvRowsToInputs(dataFlowRows, trackerStatus);
  const client = buildTranscendGraphQLClient(transcendUrl, auth);
  const syncedDataFlows = await syncDataFlows(client, dataFlowInputs, {
    classifyService,
    logger: this.logger,
  });

  if (!syncedDataFlows) {
    this.logger.error(
      colors.red(
        'Encountered error(s) syncing data flows from CSV, see logs above for more info. ',
      ),
    );
    this.process.exit(1);
  }
}
