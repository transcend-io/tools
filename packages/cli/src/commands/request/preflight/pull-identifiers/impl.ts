import type { RequestAction } from '@transcend-io/privacy-types';

import type { LocalContext } from '../../../../context.js';
import { doneInputValidation } from '../../../../lib/cli/done-input-validation.js';
import { pullManualEnrichmentIdentifiersToCsv } from '../../../../lib/manual-enrichment/index.js';

export interface PullIdentifiersCommandFlags {
  auth: string;
  sombraAuth?: string;
  transcendUrl: string;
  file: string;
  actions?: RequestAction[];
  concurrency: number;
}

export async function pullIdentifiers(
  this: LocalContext,
  { auth, transcendUrl, file, concurrency, actions, sombraAuth }: PullIdentifiersCommandFlags,
): Promise<void> {
  doneInputValidation(this.process.exit);

  await pullManualEnrichmentIdentifiersToCsv({
    file,
    transcendUrl,
    concurrency,
    requestActions: actions,
    auth,
    sombraAuth,
  });
}
