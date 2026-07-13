import colors from 'colors';

import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { logger } from '../../../logger.js';
import {
  buildPolicyEngineClient,
  formatPolicyBundleVersionSummary,
  policyEngineRequest,
  printResult,
  resolveBundleIdByName,
  resolvePolicyBundleVersion,
  setPolicyEngineCliDebug,
} from '../helpers/index.js';
import type { ActivatePolicyBundleVersionResponse } from '../types.js';

/** CLI flags for `transcend policy activate`. */
export interface ActivateCommandFlags {
  /** Logical bundle name to activate */
  'bundle-name': string;
  /** Caller-supplied version label to activate */
  version?: string;
  /** Transcend API key */
  auth: string;
  /** Transcend API URL */
  'transcend-url': string;
  /** Validate activation without flipping */
  'dry-run': boolean;
  /** Print raw JSON response */
  json: boolean;
  /** Include technical error details when a command fails */
  debug?: boolean;
}

/**
 * Activate an uploaded policy bundle version.
 *
 * Resolves `--bundle-name` to the parent bundle UUID internally, then calls the
 * Policy Engine activate endpoint. The bundle is addressed by name only -- the
 * UUID is never exposed to the operator.
 *
 * @param this - CLI context
 * @param flags - Command flags
 */
export async function activate(
  this: LocalContext,
  {
    'bundle-name': bundleName,
    version,
    auth,
    'transcend-url': transcendUrl,
    'dry-run': dryRun,
    json,
    debug = false,
  }: ActivateCommandFlags,
): Promise<void> {
  doneInputValidation(this.process.exit);
  setPolicyEngineCliDebug(debug);

  const client = buildPolicyEngineClient(transcendUrl, auth);
  const resolvedBundleId = await resolveBundleIdByName(client, bundleName);
  if (!resolvedBundleId) {
    throw new Error(`Policy bundle "${bundleName}" was not found for this organization.`);
  }
  const resolvedVersion = await resolvePolicyBundleVersion(client, resolvedBundleId, { version });

  logger.info(
    colors.green(
      dryRun
        ? `Validating activation for version "${resolvedVersion.version}"...`
        : `Activating version "${resolvedVersion.version}"...`,
    ),
  );

  const body = await policyEngineRequest(
    client
      .post(
        `v1/policy-engine/policy-bundles/${resolvedBundleId}/versions/${resolvedVersion.id}/activate`,
        {
          json: dryRun ? { dryRun: true } : {},
        },
      )
      .json<ActivatePolicyBundleVersionResponse>(),
  );

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
