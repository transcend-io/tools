import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { uploadDropFile2 } from '../../../lib/drop/index.js';

export interface DropUploadCommandFlags {
  auth: string;
  file: string;
  dropRunId: string;
  transcendUrl: string;
  sombraAuth?: string;
  batchSize: number;
  dryRun: boolean;
}

export async function upload(
  this: LocalContext,
  { auth, file, dropRunId, transcendUrl, sombraAuth, batchSize, dryRun }: DropUploadCommandFlags,
): Promise<void> {
  doneInputValidation(this.process.exit);

  await uploadDropFile2({
    file,
    dropRunId,
    auth,
    sombraAuth,
    transcendUrl,
    batchSize,
    dryRun,
  });
}
