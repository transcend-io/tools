import type { RequestAction } from '@transcend-io/privacy-types';

import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { removeUnverifiedRequestIdentifiers } from '../../../lib/requests/index.js';

export interface RejectUnverifiedIdentifiersCommandFlags {
  auth: string;
  identifierNames: string[];
  actions?: RequestAction[];
  transcendUrl: string;
}

export async function rejectUnverifiedIdentifiers(
  this: LocalContext,
  { auth, transcendUrl, identifierNames, actions = [] }: RejectUnverifiedIdentifiersCommandFlags,
): Promise<void> {
  doneInputValidation(this.process.exit);

  await removeUnverifiedRequestIdentifiers({
    requestActions: actions,
    transcendUrl,
    auth,
    identifierNames,
  });
}
