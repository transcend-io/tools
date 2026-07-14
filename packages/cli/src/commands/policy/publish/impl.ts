import fs from 'node:fs';
import path from 'node:path';

import { confirm } from '@inquirer/prompts';
import colors from 'colors';

import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { buildExampleCommand } from '../../../lib/docgen/buildExamples.js';
import { createPolicyBundle } from '../../../lib/promptMessages.js';
import { logger } from '../../../logger.js';
import type { ActivateCommandFlags } from '../activate/impl.js';
import {
  buildPolicyBundleFormData,
  buildPolicyEngineClient,
  buildOpaBundleTarball,
  defaultPolicyVersionLabel,
  formatPolicyBundleVersionSummary,
  policyEngineRequest,
  printResult,
  resolveBundleIdByName,
  setPolicyEngineCliDebug,
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
  /** Skip the "create new bundle" confirmation */
  yes: boolean;
  /** Include technical error details when a command fails */
  debug?: boolean;
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
    yes,
    debug = false,
  }: PublishCommandFlags,
): Promise<void> {
  doneInputValidation(this.process.exit);
  setPolicyEngineCliDebug(debug);

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
      responseBody = await policyEngineRequest(
        client
          .post(`v1/policy-engine/policy-bundles/${existingBundleId}/versions`, { body: form })
          .json<CreatePolicyBundleVersionResponse>(),
      );
    } else {
      if (!this.process.stdin.isTTY && !yes) {
        logger.error(
          colors.red(
            'Cannot create a new bundle in a non-interactive environment; pass --yes to confirm.',
          ),
        );
        this.process.exit(1);
        return;
      }

      if (!yes) {
        logger.warn(
          colors.yellow(`No policy bundle named "${bundleName}" exists for this organization.`),
        );
        const shouldCreate = await confirm({
          message: createPolicyBundle(bundleName),
        });
        if (!shouldCreate) {
          logger.info(colors.yellow('Publish cancelled.'));
          return;
        }
      }

      logger.info(colors.green(`Creating bundle "${bundleName}" and uploading first version...`));
      const createForm = buildPolicyBundleFormData({
        bundlePath,
        version: versionLabel,
        description,
        bundleName,
      });
      responseBody = await policyEngineRequest(
        client
          .post('v1/policy-engine/policy-bundles', {
            body: createForm,
          })
          .json<CreatePolicyBundleResponse>(),
      );
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
