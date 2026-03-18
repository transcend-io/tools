import type { RequestAction } from '@transcend-io/privacy-types';

import type { LocalContext } from '../../../../context.js';
import { doneInputValidation } from '../../../../lib/cli/done-input-validation.js';
import { retryRequestDataSilos as retryRequestDataSilosHelper } from '../../../../lib/requests/index.js';

export interface RetryRequestDataSilosCommandFlags {
  auth: string;
  dataSiloId: string;
  actions: RequestAction[];
  transcendUrl: string;
}

export async function retryRequestDataSilos(
  this: LocalContext,
  { auth, dataSiloId, actions, transcendUrl }: RetryRequestDataSilosCommandFlags,
): Promise<void> {
  doneInputValidation(this.process.exit);

  await retryRequestDataSilosHelper({
    requestActions: actions,
    transcendUrl,
    auth,
    dataSiloId,
  });
}
