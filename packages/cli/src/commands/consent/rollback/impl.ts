import { ConsentBundleType } from '@transcend-io/privacy-types';
import colors from 'colors';

import type { LocalContext } from '../../../context.js';
import { validateTranscendAuth } from '../../../lib/api-keys/index.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { rollbackConsentManagerBundles } from '../../../lib/consent-manager/rollbackConsentManagerBundles.js';

export interface RollbackCommandFlags {
  auth: string;
  bundleTypes: ConsentBundleType[];
  version: string;
  dryRun: boolean;
  transcendUrl: string;
}

export async function rollback(
  this: LocalContext,
  { auth, bundleTypes, version, dryRun, transcendUrl }: RollbackCommandFlags,
): Promise<void> {
  doneInputValidation(this.process);

  // A rollback needs one explicit target, so only a single API key is allowed
  const apiKeyOrList = await validateTranscendAuth(auth, this);
  if (typeof apiKeyOrList !== 'string') {
    this.logger.error(colors.red('rollback does not support a file of API keys. Use one API key.'));
    this.process.exit(1);
    return;
  }

  await rollbackConsentManagerBundles({
    auth: apiKeyOrList,
    transcendUrl,
    bundleTypes,
    version,
    dryRun,
  });
  this.logger.info(
    colors.green(dryRun ? 'Dry run complete. Nothing was changed.' : 'Successfully rolled back!'),
  );
}
