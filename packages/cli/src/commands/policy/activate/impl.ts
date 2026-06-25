import colors from 'colors';

import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { uuidParser } from '../../../lib/cli/parsers.js';
import { logger } from '../../../logger.js';
import {
  buildPolicyEngineClient,
  formatPolicyBundleVersionSummary,
  printResult,
  resolvePolicyBundleId,
  type ActivatePolicyBundleVersionResponse,
} from '../_helpers.js';

/** CLI flags for `transcend policy activate`. */
export interface ActivateCommandFlags {
  /** Version UUID to activate */
  versionId: string;
  /** Parent bundle UUID */
  policyBundleId?: string;
  /** Parent bundle name (resolved when policyBundleId is omitted) */
  bundleName?: string;
  /** Transcend API key */
  auth: string;
  /** Transcend API URL */
  transcendUrl: string;
  /** Validate activation without flipping */
  dryRun: boolean;
  /** Print raw JSON response */
  json: boolean;
}

/**
 * Activate an uploaded policy bundle version.
 *
 * @param this - CLI context
 * @param flags - Command flags
 */
export async function activate(
  this: LocalContext,
  { versionId, policyBundleId, bundleName, auth, transcendUrl, dryRun, json }: ActivateCommandFlags,
): Promise<void> {
  doneInputValidation(this.process.exit);

  const parsedVersionId = uuidParser(versionId);
  const client = buildPolicyEngineClient(transcendUrl, auth);
  const resolvedBundleId = await resolvePolicyBundleId(client, {
    policyBundleId: policyBundleId ? uuidParser(policyBundleId) : undefined,
    bundleName,
  });

  logger.info(
    colors.green(
      dryRun
        ? `Validating activation for version ${parsedVersionId}...`
        : `Activating version ${parsedVersionId}...`,
    ),
  );

  const body = await client
    .post(
      `api/v1/policy-engine/policy-bundles/${resolvedBundleId}/versions/${parsedVersionId}/activate`,
      {
        json: dryRun ? { dryRun: true } : {},
      },
    )
    .json<ActivatePolicyBundleVersionResponse>();

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

  logger.info(
    colors.green(dryRun ? 'Activation validation succeeded.' : 'Policy bundle version activated.'),
  );
}
