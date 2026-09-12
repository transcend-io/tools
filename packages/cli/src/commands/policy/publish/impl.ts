import colors from 'colors';

import type { LocalContext } from '../../../context.js';
import { selectCommandLogger } from '../../../lib/cli/command-output.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { buildExampleCommand } from '../../../lib/docgen/buildExamples.js';
import { inquirerConfirmBoolean } from '../../../lib/helpers/inquirer.js';
import {
  DEFAULT_POLICY_PROJECT_DIRECTORY,
  resolvePolicyProjectDirectory,
} from '../../../lib/policy/policy-project-discovery.js';
import { isInteractivePromptInvocation } from '../../../lib/scaffolding/prompts.js';
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
 * @param directory - Policy project directory
 */
export async function publish(
  this: LocalContext,
  {
    'bundle-name': bundleName,
    auth,
    'transcend-url': transcendUrl,
    version,
    description,
    json,
    yes,
    debug = false,
  }: PublishCommandFlags,
  directory: string = DEFAULT_POLICY_PROJECT_DIRECTORY,
): Promise<void> {
  doneInputValidation(this.process);
  setPolicyEngineCliDebug(debug);

  const commandLogger = selectCommandLogger(this.logger, json);
  const resolvedDir = resolvePolicyProjectDirectory(this.process.cwd(), directory);
  const versionLabel = version ?? defaultPolicyVersionLabel(bundleName);
  const client = buildPolicyEngineClient(transcendUrl, auth);
  const interactive = isInteractivePromptInvocation(
    { json, noInteractive: false },
    this.process.stdin.isTTY,
    this.process.stderr.isTTY,
  );

  let bundlePath: string | undefined;
  try {
    commandLogger.info(colors.green(`Building policy bundle from ${resolvedDir}...`));
    bundlePath = await buildOpaBundleTarball(resolvedDir);

    const existingBundleId = await resolveBundleIdByName(client, bundleName);

    let responseBody: CreatePolicyBundleResponse | CreatePolicyBundleVersionResponse;

    if (existingBundleId) {
      commandLogger.info(colors.green(`Uploading new version for bundle "${bundleName}"...`));
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
      if (!interactive && !yes) {
        this.logger.error(
          colors.red(
            'Cannot create a new bundle in non-interactive or JSON mode; pass --yes to confirm.',
          ),
        );
        this.process.exit(1);
        return;
      }

      if (!yes) {
        commandLogger.warn(
          colors.yellow(`No policy bundle named "${bundleName}" exists for this organization.`),
        );
        const shouldCreate = await inquirerConfirmBoolean({
          message: `No policy bundle named "${bundleName}" exists. Create a new bundle and upload its first version?`,
        });
        if (!shouldCreate) {
          commandLogger.info(colors.yellow('Publish cancelled.'));
          return;
        }
      }

      commandLogger.info(
        colors.green(`Creating bundle "${bundleName}" and uploading first version...`),
      );
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

    commandLogger.info(colors.green('Policy bundle version uploaded successfully.'));

    const activateCommand = buildExampleCommand<ActivateCommandFlags>(['policy', 'activate'], {
      version: responseBody.version.version,
      'bundle-name': bundleName,
    });
    commandLogger.info(
      colors.yellow(
        `Publishing a policy does not activate it. To activate this version, run:\n  ${activateCommand}`,
      ),
    );
  } finally {
    if (bundlePath && this.fs.existsSync(bundlePath)) {
      this.fs.unlinkSync(bundlePath);
    }
  }
}
