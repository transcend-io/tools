import colors from 'colors';

import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { logger } from '../../../logger.js';
import {
  buildPolicyEngineClient,
  formatPolicyBundleVersionSummary,
  printResult,
  resolveBundleIdByName,
  throwPolicyEngineRequestError,
} from '../helpers/index.js';
import type { DeactivatePolicyBundleResponse } from '../types.js';

/** CLI flags for `transcend policy deactivate`. */
export interface DeactivateCommandFlags {
  /** Logical bundle name to deactivate */
  'bundle-name': string;
  /** Transcend API key */
  auth: string;
  /** Transcend API URL */
  'transcend-url': string;
  /** Print raw JSON response */
  json: boolean;
}

/**
 * Deactivate the currently active version of a policy bundle.
 *
 * Resolves `--bundle-name` to the parent bundle UUID internally, then calls the
 * Policy Engine deactivate endpoint. The bundle is addressed by name only -- the
 * UUID is never exposed to the operator.
 *
 * @param this - CLI context
 * @param flags - Command flags
 */
export async function deactivate(
  this: LocalContext,
  { 'bundle-name': bundleName, auth, 'transcend-url': transcendUrl, json }: DeactivateCommandFlags,
): Promise<void> {
  doneInputValidation(this.process.exit);

  const client = buildPolicyEngineClient(transcendUrl, auth);

  const resolvedBundleId = await resolveBundleIdByName(client, bundleName);
  if (!resolvedBundleId) {
    throw new Error(`Policy bundle "${bundleName}" was not found for this organization.`);
  }

  logger.info(colors.green(`Deactivating active version for bundle "${bundleName}"...`));

  let body: DeactivatePolicyBundleResponse;
  try {
    body = await client
      .post(`v1/policy-engine/policy-bundles/${resolvedBundleId}/deactivate`)
      .json<DeactivatePolicyBundleResponse>();
  } catch (err) {
    // The monolith 409 references the internal bundle UUID; rewrite it to the
    // user-supplied bundle name so the error is actionable.
    const statusCode = (err as { response?: { statusCode?: number } })?.response?.statusCode;
    if (statusCode === 409) {
      throw new Error(`Policy bundle "${bundleName}" has no active version.`, { cause: err });
    }
    throwPolicyEngineRequestError(err);
  }

  printResult(this.process.stdout, {
    json,
    data: body,
    renderTable: () =>
      [
        `bundleId    ${body.bundle.id}`,
        `bundleName  ${body.bundle.bundleName}`,
        formatPolicyBundleVersionSummary(body.version),
      ].join('\n'),
  });

  logger.info(colors.green('Policy bundle version deactivated.'));
}
