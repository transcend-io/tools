import fs from 'node:fs';

import type { Got } from 'got';

import { buildPolicyBundleFormData } from './buildPolicyBundleFormData.js';
import { defaultPolicyVersionLabel } from './defaultPolicyVersionLabel.js';
import { policyEngineRequest } from './formatPolicyEngineRequestError.js';
import {
  packPolicyBundleTarball,
  packPolicyBundleTarballFromFiles,
} from './packPolicyBundleTarball.js';
import { resolveBundle, resolveBundleIdByName } from './resolveBundle.js';
import { resolvePolicyBundleVersion } from './resolvePolicyBundleVersion.js';
import type {
  ActivatePolicyBundleVersionResponse,
  CreatePolicyBundleResponse,
  CreatePolicyBundleVersionResponse,
  DeactivatePolicyBundleResponse,
  GetPolicyBundleVersionResponse,
  PolicyBundleListResponse,
  PolicyBundleVersionListResponse,
} from './types.js';

/**
 * Policy Engine operations aligned with `transcend policy` CLI commands.
 *
 * These follow the same REST paths and resolution logic as the CLI so MCP
 * behavior matches what customers run locally (per Policy Engine team review).
 */

/**
 * Lists policy bundles (mirrors `transcend policy bundles --json`).
 *
 * @param client - Policy Engine REST client
 * @param options - Pagination options
 * @returns Bundle list response
 */
export async function listPolicyBundles(
  client: Got,
  options: { limit?: number; offset?: number } = {},
): Promise<PolicyBundleListResponse> {
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;
  return policyEngineRequest(
    client
      .get('v1/policy-engine/policy-bundles', {
        searchParams: { limit, offset },
      })
      .json<PolicyBundleListResponse>(),
  );
}

/**
 * Lists versions for a bundle (mirrors `transcend policy versions --json`).
 *
 * @param client - Policy Engine REST client
 * @param bundleId - Parent bundle UUID
 * @param options - Cursor pagination options
 * @returns Version list response
 */
export async function listPolicyBundleVersions(
  client: Got,
  bundleId: string,
  options: { limit?: number; after?: string } = {},
): Promise<PolicyBundleVersionListResponse> {
  const limit = options.limit ?? 50;
  const searchParams: Record<string, string | number> = { limit };
  if (options.after) {
    searchParams.after = options.after;
  }

  return policyEngineRequest(
    client
      .get(`v1/policy-engine/policy-bundles/${bundleId}/versions`, {
        searchParams,
      })
      .json<PolicyBundleVersionListResponse>(),
  );
}

/**
 * Fetches version metadata and presigned download URL (mirrors `transcend policy download --json`).
 *
 * @param client - Policy Engine REST client
 * @param bundleId - Parent bundle UUID
 * @param versionId - Version UUID
 * @returns Version metadata with download URL
 */
export async function getPolicyBundleVersion(
  client: Got,
  bundleId: string,
  versionId: string,
): Promise<GetPolicyBundleVersionResponse> {
  return policyEngineRequest(
    client
      .get(`v1/policy-engine/policy-bundles/${bundleId}/versions/${versionId}`)
      .json<GetPolicyBundleVersionResponse>(),
  );
}

/** Options for publishing a policy bundle from disk or an in-memory file map. */
export interface PublishPolicyBundleOptions {
  /** Directory containing manifest.json and .rego files (mutually exclusive with files) */
  dir?: string;
  /**
   * Relative path → file contents (same shape as policy_help templateFiles.files).
   * Mutually exclusive with dir.
   */
  files?: Record<string, string>;
  /** Tenant-unique bundle name */
  bundleName: string;
  /** Optional version label */
  version?: string;
  /** Optional version description */
  description?: string;
}

/**
 * Uploads an inert policy bundle version (mirrors `transcend policy publish --yes --json`).
 *
 * Uses {@link packPolicyBundleTarball} / {@link packPolicyBundleTarballFromFiles} without a
 * local `opa` binary; the monolith validates Rego on upload.
 *
 * @param client - Policy Engine REST client
 * @param options - Publish options (`dir` or `files`, not both)
 * @returns Created bundle + version or new version on existing bundle
 */
export async function publishPolicyBundle(
  client: Got,
  options: PublishPolicyBundleOptions,
): Promise<CreatePolicyBundleResponse | CreatePolicyBundleVersionResponse> {
  const hasDir = Boolean(options.dir);
  const hasFiles = options.files !== undefined;
  if (hasDir === hasFiles) {
    throw new Error('Provide exactly one of dir or files.');
  }

  const versionLabel = options.version ?? defaultPolicyVersionLabel(options.bundleName);
  let bundlePath: string | undefined;

  try {
    bundlePath = hasFiles
      ? await packPolicyBundleTarballFromFiles(options.files!)
      : await packPolicyBundleTarball(options.dir!);
    const existingBundleId = await resolveBundleIdByName(client, options.bundleName);

    if (existingBundleId) {
      const form = buildPolicyBundleFormData({
        bundlePath,
        version: versionLabel,
        description: options.description,
      });
      return policyEngineRequest(
        client
          .post(`v1/policy-engine/policy-bundles/${existingBundleId}/versions`, { body: form })
          .json<CreatePolicyBundleVersionResponse>(),
      );
    }

    const createForm = buildPolicyBundleFormData({
      bundlePath,
      version: versionLabel,
      description: options.description,
      bundleName: options.bundleName,
    });
    return policyEngineRequest(
      client
        .post('v1/policy-engine/policy-bundles', {
          body: createForm,
        })
        .json<CreatePolicyBundleResponse>(),
    );
  } finally {
    if (bundlePath && fs.existsSync(bundlePath)) {
      fs.unlinkSync(bundlePath);
    }
  }
}

/** Options for activating a policy bundle version. */
export interface ActivatePolicyBundleOptions {
  /** Tenant-unique bundle name */
  bundleName: string;
  /** Version UUID to activate */
  versionId?: string;
  /** Caller-supplied version label (alternative to versionId) */
  version?: string;
}

/**
 * Activates a policy bundle version (mirrors `transcend policy activate --json`).
 *
 * @param client - Policy Engine REST client
 * @param options - Activation options
 * @returns Updated bundle and activated version
 */
export async function activatePolicyBundleVersion(
  client: Got,
  options: ActivatePolicyBundleOptions,
): Promise<ActivatePolicyBundleVersionResponse> {
  const bundle = await resolveBundle(client, { bundleName: options.bundleName });
  const resolvedVersion = await resolvePolicyBundleVersion(client, bundle.id, {
    versionId: options.versionId,
    version: options.version,
  });

  try {
    return await policyEngineRequest(
      client
        .post(
          `v1/policy-engine/policy-bundles/${bundle.id}/versions/${resolvedVersion.id}/activate`,
          { json: {} },
        )
        .json<ActivatePolicyBundleVersionResponse>(),
    );
  } catch (error) {
    const statusCode = (error as { cause?: { response?: { statusCode?: number } } })?.cause
      ?.response?.statusCode;
    if (statusCode === 409) {
      throw new Error(
        `Version "${resolvedVersion.version}" of policy bundle "${options.bundleName}" is already the active version.`,
        { cause: error },
      );
    }
    throw error;
  }
}

/**
 * Deactivates the active version of a policy bundle (mirrors `transcend policy deactivate --json`).
 *
 * @param client - Policy Engine REST client
 * @param bundleName - Tenant-unique bundle name
 * @returns Updated bundle and deactivated version
 */
export async function deactivatePolicyBundle(
  client: Got,
  bundleName: string,
): Promise<DeactivatePolicyBundleResponse> {
  const bundle = await resolveBundle(client, { bundleName });

  try {
    return await policyEngineRequest(
      client
        .post(`v1/policy-engine/policy-bundles/${bundle.id}/deactivate`)
        .json<DeactivatePolicyBundleResponse>(),
    );
  } catch (error) {
    const statusCode = (error as { cause?: { response?: { statusCode?: number } } })?.cause
      ?.response?.statusCode;
    if (statusCode === 409) {
      throw new Error(`Policy bundle "${bundleName}" has no active version.`, { cause: error });
    }
    throw error;
  }
}
