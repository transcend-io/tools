import {
  PERMISSIONS_POLICY_BUNDLE_NAME,
  type PolicyTemplateName,
} from './policy-scaffold-templates.js';

/** Inputs used to soft-warn about Permissions vs generic publish naming. */
export interface PolicyPublishBundleNameHintInput {
  /** Optional scaffold template from `.manifest` metadata. */
  template?: PolicyTemplateName;
  /** Declared OPA package roots. */
  roots: string[];
}

/**
 * Whether local authoring signals suggest a Permissions API bundle.
 *
 * Prefers explicit `metadata.transcend.io.template`. Without metadata, falls
 * back to a root that is exactly `permissions` or nested under it.
 *
 * @param input - Manifest template hint and roots
 * @returns Whether the local tree looks Permissions-oriented
 */
function looksLikePermissionsBundle(input: PolicyPublishBundleNameHintInput): boolean {
  if (input.template === 'permissions') {
    return true;
  }
  if (input.template === 'generic') {
    return false;
  }
  return input.roots.some(
    (root) =>
      root === PERMISSIONS_POLICY_BUNDLE_NAME ||
      root.startsWith(`${PERMISSIONS_POLICY_BUNDLE_NAME}/`),
  );
}

/**
 * Soft-warning when `--remote-bundle-name` disagrees with Permissions conventions.
 *
 * Upload does not enforce bundle kinds. Permissions API only loads the
 * remote bundle named {@link PERMISSIONS_POLICY_BUNDLE_NAME}.
 *
 * @param bundleName - Value of `--remote-bundle-name`
 * @param input - Local manifest template/roots
 * @returns Warning text, or undefined when names align
 */
export function formatPolicyPublishBundleNameHint(
  bundleName: string,
  input: PolicyPublishBundleNameHintInput,
): string | undefined {
  const permissionsLocal = looksLikePermissionsBundle(input);
  const permissionsRemote = bundleName === PERMISSIONS_POLICY_BUNDLE_NAME;

  if (permissionsLocal && !permissionsRemote) {
    return (
      `This directory looks like a Permissions API policy, but --remote-bundle-name is ` +
      `"${bundleName}". Permissions API only loads the remote bundle named ` +
      `"${PERMISSIONS_POLICY_BUNDLE_NAME}". Upload still succeeds; pass ` +
      `--remote-bundle-name=${PERMISSIONS_POLICY_BUNDLE_NAME} if that is the intended path.`
    );
  }

  if (!permissionsLocal && permissionsRemote) {
    return (
      `--remote-bundle-name=${PERMISSIONS_POLICY_BUNDLE_NAME} reserves the Permissions API ` +
      `path. Upload treats all bundles the same; only that fixed name is queried by ` +
      `the Permissions API. Continue only if you intend this bundle for the Permissions API.`
    );
  }

  return undefined;
}
