import { ConsentTrackerStatus } from '@transcend-io/privacy-types';

import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { uploadDataFlowsFromCsv as uploadDataFlowsFromCsvHelper } from '../../../lib/consent-manager/index.js';

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

  await uploadDataFlowsFromCsvHelper(
    {
      auth,
      trackerStatus,
      file,
      classifyService,
      transcendUrl,
    },
    {
      fs: this.fs,
      logger: this.logger,
      ['process']: this.process,
    },
  );
}
