import fs from 'node:fs';
import path from 'node:path';

import colors from 'colors';
import got from 'got';

import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { logger } from '../../../logger.js';
import { EMPTY_CELL } from '../constants.js';
import {
  buildPolicyEngineClient,
  policyEngineRequest,
  printResult,
  resolveBundleByName,
  resolvePolicyBundleVersion,
  setPolicyEngineCliDebug,
} from '../helpers/index.js';
import type { GetPolicyBundleVersionResponse } from '../types.js';

/** CLI flags for `transcend policy download`. */
export interface DownloadCommandFlags {
  /** Tenant-unique bundle name */
  'bundle-name': string;
  /**
   * Caller-supplied version label to download.
   * When omitted, downloads the bundle's currently active version.
   */
  version?: string;
  /** Destination file path; defaults to `{bundleName}-{version}.tar.gz` */
  output?: string;
  /** Transcend API key */
  auth: string;
  /** Transcend API URL */
  'transcend-url': string;
  /** Print metadata + presigned URL as JSON without writing a file */
  json: boolean;
  /** Include technical error details when a command fails */
  debug?: boolean;
}

/**
 * Builds the default output path for a downloaded policy bundle.
 *
 * @param bundleName - Tenant-unique bundle name
 * @param version - Caller-supplied version label
 * @returns Relative path `{bundleName}-{version}.tar.gz`
 */
export function defaultPolicyDownloadOutputPath(bundleName: string, version: string): string {
  return `${bundleName}-${version}.tar.gz`;
}

/**
 * Formats download metadata for human-readable CLI output.
 *
 * @param body - Version metadata from the Policy Engine API
 * @param outputPath - Destination path written (or that would be written)
 * @returns Summary lines
 */
function formatDownloadSummary(body: GetPolicyBundleVersionResponse, outputPath: string): string {
  return [
    `bundleName  ${body.bundleName}`,
    `version     ${body.version}`,
    `output      ${outputPath}`,
    `sha256      ${body.sha256}`,
    `sizeBytes   ${body.sizeBytes}`,
    `uploadedAt  ${body.uploadedAt}`,
    `activatedAt ${body.activatedAt ?? EMPTY_CELL}`,
  ].join('\n');
}

/**
 * Download a compiled policy bundle version to disk.
 *
 * Resolves `--bundle-name` and an optional `--version` to IDs, fetches a
 * short-lived presigned S3 URL from the monolith, then downloads the `.tar.gz`
 * bytes directly from S3 (the monolith does not proxy the artifact).
 *
 * When `--version` is omitted, downloads the bundle's currently active version.
 * If the bundle has no active version, exits with an error.
 *
 * @param this - CLI context
 * @param flags - Command flags
 */
export async function download(
  this: LocalContext,
  {
    'bundle-name': bundleName,
    version,
    output,
    auth,
    'transcend-url': transcendUrl,
    json,
    debug = false,
  }: DownloadCommandFlags,
): Promise<void> {
  doneInputValidation(this.process.exit);
  setPolicyEngineCliDebug(debug);

  const client = buildPolicyEngineClient(transcendUrl, auth);

  const bundle = await resolveBundleByName(client, bundleName);
  if (!bundle) {
    throw new Error(`Policy bundle "${bundleName}" was not found for this organization.`);
  }

  let versionId: string;
  if (version) {
    const resolvedVersion = await resolvePolicyBundleVersion(client, bundle.id, { version });
    versionId = resolvedVersion.id;
  } else {
    if (!bundle.activeVersionId) {
      throw new Error(`Policy bundle "${bundleName}" has no active version.`);
    }
    versionId = bundle.activeVersionId;
  }

  logger.info(
    colors.green(
      version
        ? `Fetching download URL for bundle "${bundleName}" version "${version}"...`
        : `Fetching download URL for active version of bundle "${bundleName}"...`,
    ),
  );

  const body = await policyEngineRequest(
    client
      .get(`v1/policy-engine/policy-bundles/${bundle.id}/versions/${versionId}`)
      .json<GetPolicyBundleVersionResponse>(),
  );

  if (json) {
    printResult(this.process.stdout, {
      json: true,
      data: body,
    });
    return;
  }

  const outputPath = path.resolve(
    output ?? defaultPolicyDownloadOutputPath(bundleName, body.version),
  );

  logger.info(colors.green(`Downloading policy bundle to ${outputPath}...`));

  let bundleBytes: Uint8Array;
  try {
    bundleBytes = await got(body.downloadUrl).buffer();
  } catch (err) {
    throw new Error(
      `Failed to download policy bundle from the presigned URL: ${
        err instanceof Error ? err.message : String(err)
      }`,
      { cause: err },
    );
  }

  const outputDir = path.dirname(outputPath);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, bundleBytes);

  printResult(this.process.stdout, {
    json: false,
    data: body,
    renderTable: () => formatDownloadSummary(body, outputPath),
  });

  logger.info(colors.green('Policy bundle downloaded successfully.'));
}
