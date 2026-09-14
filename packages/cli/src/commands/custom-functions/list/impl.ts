import { buildTranscendGraphQLClient, fetchAllCustomFunctions } from '@transcend-io/sdk';
import colors from 'colors';

import type { LocalContext } from '../../../context.js';
import { validateTranscendAuth } from '../../../lib/api-keys/index.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { buildCustomFunctionListJsonResult } from '../../../lib/custom-functions/command-output.js';

export interface CustomFunctionsListCommandFlags {
  /** Transcend API key. */
  auth: string;
  /** Transcend backend URL. */
  transcendUrl: string;
  /** Emit stable JSON output. */
  json: boolean;
}

export async function list(
  this: LocalContext,
  { auth, transcendUrl, json }: CustomFunctionsListCommandFlags,
): Promise<void> {
  doneInputValidation(this.process);

  const apiKeyOrList = validateTranscendAuth(auth, this);
  if (Array.isArray(apiKeyOrList)) {
    this.logger.error(
      colors.red(
        'transcend custom-functions list does not support a list of API keys — pass a single API key.',
      ),
    );
    this.process.exit(1);
  }

  const client = buildTranscendGraphQLClient(transcendUrl, apiKeyOrList as string);
  const customFunctions = await fetchAllCustomFunctions(
    client,
    json ? {} : { logger: this.logger },
  );

  if (json) {
    const result = buildCustomFunctionListJsonResult(customFunctions);
    this.process.stdout.write(`${JSON.stringify(result)}\n`);
    return;
  }

  if (customFunctions.length === 0) {
    this.logger.info(colors.yellow('No custom functions found in this organization.'));
    return;
  }

  this.logger.info(colors.magenta(`Found ${customFunctions.length} custom function(s):`));
  customFunctions.forEach((customFunction) => {
    const active = customFunction.activeVersion
      ? `active v${customFunction.activeVersion.versionNumber}`
      : 'no active version';
    const draft =
      customFunction.hasPendingDraft && customFunction.draftVersion
        ? `, pending draft v${customFunction.draftVersion.versionNumber}`
        : '';
    this.logger.info(
      `  - ${colors.green(customFunction.name)} [${customFunction.type}] ` +
        `(${customFunction.lifecycleState.toLowerCase()}, ${active}${draft}) ` +
        colors.dim(`id: ${customFunction.id}`),
    );
  });
}
