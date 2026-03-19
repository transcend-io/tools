import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { skipPreflightJobs as skipPreflightJobsHelper } from '../../../lib/requests/index.js';

export interface SkipPreflightJobsCommandFlags {
  auth: string;
  enricherIds: string[];
  transcendUrl: string;
}

export async function skipPreflightJobs(
  this: LocalContext,
  { auth, transcendUrl, enricherIds }: SkipPreflightJobsCommandFlags,
): Promise<void> {
  doneInputValidation(this.process.exit);

  await skipPreflightJobsHelper({
    transcendUrl,
    auth,
    enricherIds,
  });
}
