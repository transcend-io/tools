import { buildTranscendGraphQLClient, fetchAllCustomFunctions } from '@transcend-io/sdk';
import colors from 'colors';

import type { LocalContext } from '../../../context.js';
import { validateTranscendAuth } from '../../../lib/api-keys/index.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { logger } from '../../../logger.js';

export interface CustomFunctionsListCommandFlags {
  auth: string;
  transcendUrl: string;
}

export async function list(
  this: LocalContext,
  { auth, transcendUrl }: CustomFunctionsListCommandFlags,
): Promise<void> {
  doneInputValidation(this.process.exit);

  const apiKeyOrList = validateTranscendAuth(auth);
  if (Array.isArray(apiKeyOrList)) {
    logger.error(
      colors.red(
        'transcend custom-functions list does not support a list of API keys — pass a single API key.',
      ),
    );
    this.process.exit(1);
  }

  const client = buildTranscendGraphQLClient(transcendUrl, apiKeyOrList as string);
  const customFunctions = await fetchAllCustomFunctions(client, { logger });

  if (customFunctions.length === 0) {
    logger.info(colors.yellow('No custom functions found in this organization.'));
    return;
  }

  logger.info(colors.magenta(`Found ${customFunctions.length} custom function(s):`));
  customFunctions.forEach((customFunction) => {
    const active = customFunction.activeVersion
      ? `active v${customFunction.activeVersion.versionNumber}`
      : 'no active version';
    const draft =
      customFunction.hasPendingDraft && customFunction.draftVersion
        ? `, pending draft v${customFunction.draftVersion.versionNumber}`
        : '';
    logger.info(
      `  - ${colors.green(customFunction.name)} [${customFunction.type}] ` +
        `(${customFunction.lifecycleState.toLowerCase()}, ${active}${draft}) ` +
        colors.dim(`id: ${customFunction.id}`),
    );
  });
}
