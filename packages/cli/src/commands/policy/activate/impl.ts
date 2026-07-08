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
  resolvePolicyBundleVersion,
} from '../helpers/index.js';
import type { ActivatePolicyBundleVersionResponse } from '../types.js';

/** CLI flags for `transcend policy activate`. */
export interface ActivateCommandFlags {
  /** Caller-supplied version label to activate */
  version?: string;
  /** Parent bundle UUID */
  'policy-bundle-id'?: string;
  /** Parent bundle name (resolved when --policy-bundle-id is omitted) */
  'bundle-name'?: string;
  /** Transcend API key */
  auth: string;
  /** Transcend API URL */
  'transcend-url': string;
  /** Validate activation without flipping */
  'dry-run': boolean;
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
  {
    version,
    'policy-bundle-id': policyBundleId,
    'bundle-name': bundleName,
    auth,
    'transcend-url': transcendUrl,
    'dry-run': dryRun,
    json,
  }: ActivateCommandFlags,
): Promise<void> {
  doneInputValidation(this.process.exit);

  const client = buildPolicyEngineClient(transcendUrl, auth);
  const resolvedBundleId = await resolvePolicyBundleId(client, {
    policyBundleId: policyBundleId ? uuidParser(policyBundleId) : undefined,
    bundleName,
  });
  const resolvedVersion = await resolvePolicyBundleVersion(client, resolvedBundleId, { version });

  logger.info(
    colors.green(
      dryRun
        ? `Validating activation for version "${resolvedVersion.version}"...`
        : `Activating version "${resolvedVersion.version}"...`,
    ),
  );

  const body = await client
    .post(
      `v1/policy-engine/policy-bundles/${resolvedBundleId}/versions/${resolvedVersion.id}/activate`,
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
