import fs from 'node:fs';
import path from 'node:path';

import colors from 'colors';

import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { buildExampleCommand } from '../../../lib/docgen/buildExamples.js';
import { logger } from '../../../logger.js';
import type { ActivateCommandFlags } from '../activate/impl.js';
import {
  buildPolicyBundleFormData,
  buildPolicyEngineClient,
  buildOpaBundleTarball,
  defaultPolicyVersionLabel,
  formatPolicyBundleVersionSummary,
  formatPolicyEngineRequestError,
  printResult,
  resolveBundleIdByName,
} from '../helpers/index.js';
import type { CreatePolicyBundleResponse, CreatePolicyBundleVersionResponse } from '../types.js';

/** CLI flags for `transcend policy publish`. */
export interface PublishCommandFlags {
  /** Directory containing Rego policy files */
  dir: string;
  /** Tenant-unique bundle name */
  'bundle-name': string;
  /** Transcend API key */
  auth: string;
  /** Transcend API URL */
  'transcend-url': string;
  /** Version label (defaults to `{bundleName}-yyyy-mm-dd-hh-mm-ss`) */
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
  {
    dir,
    'bundle-name': bundleName,
    auth,
    'transcend-url': transcendUrl,
    version,
    description,
    json,
  }: PublishCommandFlags,
): Promise<void> {
  doneInputValidation(this.process.exit);

  const resolvedDir = path.resolve(dir);
  const versionLabel = version ?? defaultPolicyVersionLabel(bundleName);
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
      try {
        responseBody = await client
          .post(`v1/policy-engine/policy-bundles/${existingBundleId}/versions`, { body: form })
          .json<CreatePolicyBundleVersionResponse>();
      } catch (err) {
        throw new Error(formatPolicyEngineRequestError(err), { cause: err });
      }
    } else {
      logger.info(colors.green(`Creating bundle "${bundleName}" and uploading first version...`));
      const createForm = buildPolicyBundleFormData({
        bundlePath,
        version: versionLabel,
        description,
        bundleName,
      });
      try {
        responseBody = await client
          .post('v1/policy-engine/policy-bundles', {
            body: createForm,
          })
          .json<CreatePolicyBundleResponse>();
      } catch (err) {
        throw new Error(formatPolicyEngineRequestError(err), { cause: err });
      }
    }

    printResult(this.process.stdout, {
      json,
      data: responseBody,
      renderTable: () => formatPolicyBundleVersionSummary(responseBody.version),
    });

    logger.info(colors.green('Policy bundle version uploaded successfully.'));

    const activateCommand = buildExampleCommand<ActivateCommandFlags>(['policy', 'activate'], {
      version: responseBody.version.version,
      'bundle-name': bundleName,
    });
    logger.info(
      colors.yellow(
        `Publishing a policy does not activate it. To activate this version, run:\n  ${activateCommand}`,
      ),
    );
  } finally {
    if (bundlePath && fs.existsSync(bundlePath)) {
      fs.unlinkSync(bundlePath);
    }
  }
}
