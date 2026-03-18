import type { LocalContext } from '../../../../context.js';
import { doneInputValidation } from '../../../../lib/cli/done-input-validation.js';
import { pushCronIdentifiersFromCsv } from '../../../../lib/cron/index.js';

export interface MarkIdentifiersCompletedCommandFlags {
  file: string;
  transcendUrl: string;
  auth: string;
  sombraAuth?: string;
  dataSiloId: string;
}

export async function markIdentifiersCompleted(
  this: LocalContext,
  { file, transcendUrl, auth, sombraAuth, dataSiloId }: MarkIdentifiersCompletedCommandFlags,
): Promise<void> {
  doneInputValidation(this.process.exit);

  await pushCronIdentifiersFromCsv({
    file,
    transcendUrl,
    auth,
    sombraAuth,
    dataSiloId,
  });
}
