import type {
  RequestAction,
  RequestDataSiloStatus,
  RequestStatus,
} from '@transcend-io/privacy-types';

import type { LocalContext } from '../../../../context.js';
import { doneInputValidation } from '../../../../lib/cli/done-input-validation.js';
import { skipRequestDataSilos as skipRequestDataSilosHelper } from '../../../../lib/requests/index.js';

export interface SkipRequestDataSilosCommandFlags {
  auth: string;
  dataSiloId: string;
  transcendUrl: string;
  statuses: RequestStatus[];
  status: (typeof RequestDataSiloStatus)['Skipped'] | (typeof RequestDataSiloStatus)['Resolved'];
  actionTypes?: RequestAction[];
}

export async function skipRequestDataSilos(
  this: LocalContext,
  {
    auth,
    dataSiloId,
    status,
    statuses,
    transcendUrl,
    actionTypes,
  }: SkipRequestDataSilosCommandFlags,
): Promise<void> {
  doneInputValidation(this.process.exit);

  await skipRequestDataSilosHelper({
    transcendUrl,
    auth,
    status,
    dataSiloId,
    requestStatuses: statuses,
    actionTypes,
  });
}
