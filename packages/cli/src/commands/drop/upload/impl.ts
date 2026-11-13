import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { uploadDropFile2 } from '../../../lib/drop/index.js';

export interface DropUploadCommandFlags {
  /** Transcend API key. */
  auth: string;
  /** Path to the DROP File 2 CSV. */
  file: string;
  /** DROP run receiving the matched records. */
  dropRunId: string;
  /** Transcend backend URL. */
  transcendUrl: string;
  /** Internal key for a self-hosted Sombra. */
  sombraAuth?: string;
  /** Person-scoped requests per bulk submission. */
  batchSize: number;
  /** Whether to validate without submitting requests. */
  dryRun: boolean;
}

/**
 * Submit one broker-generated File 2 through the DROP bulk request flow.
 *
 * @param flags - Validated command flags.
 */
export async function upload(
  this: LocalContext,
  { auth, file, dropRunId, transcendUrl, sombraAuth, batchSize, dryRun }: DropUploadCommandFlags,
): Promise<void> {
  doneInputValidation(this.process);

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
