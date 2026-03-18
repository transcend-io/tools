import { RequestAction, RequestOrigin } from '@transcend-io/privacy-types';

import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { approvePrivacyRequests } from '../../../lib/requests/index.js';

export interface ApproveCommandFlags {
  auth: string;
  actions: RequestAction[];
  origins?: RequestOrigin[];
  silentModeBefore?: Date;
  createdAtBefore?: Date;
  createdAtAfter?: Date;
  updatedAtBefore?: Date;
  updatedAtAfter?: Date;
  transcendUrl: string;
  concurrency: number;
}

export async function approve(
  this: LocalContext,
  {
    auth,
    actions,
    origins,
    silentModeBefore,
    createdAtBefore,
    createdAtAfter,
    updatedAtBefore,
    updatedAtAfter,
    transcendUrl,
    concurrency,
  }: ApproveCommandFlags,
): Promise<void> {
  doneInputValidation(this.process.exit);

  await approvePrivacyRequests({
    transcendUrl,
    requestActions: actions,
    auth,
    requestOrigins: origins,
    concurrency,
    silentModeBefore,
    createdAtBefore,
    createdAtAfter,
    updatedAtBefore,
    updatedAtAfter,
  });
}
