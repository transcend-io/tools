import { RequestAction, RequestStatus } from '@transcend-io/privacy-types';

import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { cancelPrivacyRequests } from '../../../lib/requests/index.js';

export interface CancelCommandFlags {
  auth: string;
  actions: RequestAction[];
  statuses?: RequestStatus[];
  requestIds?: string[];
  silentModeBefore?: Date;
  createdAtBefore?: Date;
  createdAtAfter?: Date;
  updatedAtBefore?: Date;
  updatedAtAfter?: Date;
  cancellationTitle: string;
  transcendUrl: string;
  concurrency: number;
}

export async function cancel(
  this: LocalContext,
  {
    auth,
    actions,
    statuses = [],
    requestIds,
    silentModeBefore,
    createdAtBefore,
    createdAtAfter,
    updatedAtBefore,
    updatedAtAfter,
    cancellationTitle,
    transcendUrl,
    concurrency,
  }: CancelCommandFlags,
): Promise<void> {
  doneInputValidation(this.process.exit);

  await cancelPrivacyRequests({
    transcendUrl,
    requestActions: actions,
    auth,
    cancellationTitle,
    requestIds,
    statuses,
    concurrency,
    silentModeBefore: silentModeBefore ? new Date(silentModeBefore) : undefined,
    createdAtBefore: createdAtBefore ? new Date(createdAtBefore) : undefined,
    createdAtAfter: createdAtAfter ? new Date(createdAtAfter) : undefined,
    updatedAtBefore: updatedAtBefore ? new Date(updatedAtBefore) : undefined,
    updatedAtAfter: updatedAtAfter ? new Date(updatedAtAfter) : undefined,
  });
}
