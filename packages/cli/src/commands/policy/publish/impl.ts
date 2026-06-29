import fs from 'node:fs';
import path from 'node:path';

import colors from 'colors';

import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { logger } from '../../../logger.js';
import {
  buildPolicyBundleFormData,
  buildPolicyEngineClient,
  buildOpaBundleTarball,
  defaultPolicyVersionLabel,
  formatPolicyBundleVersionSummary,
  printResult,
  resolveBundleIdByName,
  type CreatePolicyBundleResponse,
  type CreatePolicyBundleVersionResponse,
} from '../helpers.js';

/** CLI flags for `transcend policy publish`. */
export interface PublishCommandFlags {
  /** Directory containing Rego policy files */
  dir: string;
  /** Tenant-unique bundle name */
  bundleName: string;
  /** Transcend API key */
  auth: string;
  /** Transcend API URL */
  transcendUrl: string;
  /** Version label (defaults to git SHA or timestamp) */
  version?: string;
  /** Optional version description */
  description?: string;
  /** Print raw JSON response */
  json: boolean;
}

/**
 * Build and upload a new immutable policy bundle version.
 *
 * @param this - CLI context
 * @param flags - Command flags
 */
export async function publish(
  this: LocalContext,
  { dir, bundleName, auth, transcendUrl, version, description, json }: PublishCommandFlags,
): Promise<void> {
  doneInputValidation(this.process.exit);

  const resolvedDir = path.resolve(dir);
  const versionLabel = version ?? defaultPolicyVersionLabel(resolvedDir);
  const client = buildPolicyEngineClient(transcendUrl, auth);

  let bundlePath: string | undefined;
  try {
    logger.info(colors.green(`Building policy bundle from ${resolvedDir}...`));
    bundlePath = await buildOpaBundleTarball(resolvedDir);

    const existingBundleId = await resolveBundleIdByName(client, bundleName);

    let responseBody: CreatePolicyBundleResponse | CreatePolicyBundleVersionResponse;

    if (existingBundleId) {
      logger.info(colors.green(`Uploading new version for bundle "${bundleName}"...`));
      const form = buildPolicyBundleFormData({
        bundlePath,
        version: versionLabel,
        description,
      });
      responseBody = await client
        .post(`api/v1/policy-engine/policy-bundles/${existingBundleId}/versions`, { body: form })
        .json<CreatePolicyBundleVersionResponse>();
    } else {
      logger.info(colors.green(`Creating bundle "${bundleName}" and uploading first version...`));
      const createForm = buildPolicyBundleFormData({
        bundlePath,
        version: versionLabel,
        description,
        bundleName,
      });
      responseBody = await client
        .post('api/v1/policy-engine/policy-bundles', {
          body: createForm,
        })
        .json<CreatePolicyBundleResponse>();
    }

    printResult(this.process.stdout, {
      json,
      data: responseBody,
      renderTable: () => formatPolicyBundleVersionSummary(responseBody.version),
    });

    logger.info(colors.green('Policy bundle version uploaded successfully.'));
  } finally {
    if (bundlePath && fs.existsSync(bundlePath)) {
      fs.unlinkSync(bundlePath);
    }
  }
}
