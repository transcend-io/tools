import { createToolResult, defineTool, z } from '@transcend-io/mcp-server-base';

import {
  activatePolicyBundleVersion,
  deactivatePolicyBundle,
  getPolicyBundleById,
  listPolicyBundles,
} from '../helpers/policyCliOperations.js';
import { createPolicyEngineClient, type PolicyToolClients } from '../helpers/policyContext.js';

export const PolicySetLiveSchema = z.object({
  action: z.enum(['activate', 'deactivate']).describe('Whether to go live or take offline'),
  bundleId: z.string().uuid().optional().describe('Policy bundle UUID'),
  bundleName: z
    .string()
    .optional()
    .describe('Tenant-unique bundle name (required unless bundleId is set)'),
  versionId: z
    .string()
    .uuid()
    .optional()
    .describe('Version UUID to activate (required for activate unless version label is set)'),
  version: z.string().optional().describe('Version label to activate (alternative to versionId)'),
});
export type PolicySetLiveInput = z.infer<typeof PolicySetLiveSchema>;

export function createPolicySetLiveTool(clients: PolicyToolClients) {
  return defineTool({
    name: 'policy_set_live',
    description:
      'Explicit go-live or take-offline step after policy_publish. ' +
      'action "activate" makes a version live; "deactivate" clears the active version. ' +
      'Mirrors transcend policy activate / deactivate. Requires Activate Policy scope.',
    category: 'Policy Engine',
    readOnly: false,
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    zodSchema: PolicySetLiveSchema,
    handler: async ({ action, bundleId, bundleName, versionId, version }) => {
      const client = createPolicyEngineClient(clients);

      const bundle = bundleId
        ? await getPolicyBundleById(client, bundleId)
        : bundleName
          ? (
              await listPolicyBundles(client, {
                bundleName,
                limit: 1,
                offset: 0,
              })
            ).nodes[0]
          : undefined;

      if (!bundle) {
        throw new Error(
          bundleId
            ? `Policy bundle with id "${bundleId}" was not found.`
            : bundleName
              ? `Policy bundle "${bundleName}" was not found.`
              : 'Provide bundleId or bundleName.',
        );
      }

      if (action === 'deactivate') {
        const response = await deactivatePolicyBundle(client, bundle.bundleName);
        return createToolResult(true, {
          action,
          message: `Deactivated active version of bundle "${response.bundle.bundleName}".`,
          bundle: response.bundle,
          version: response.version,
        });
      }

      if (!versionId && !version) {
        throw new Error('Provide versionId or version when action is "activate".');
      }

      const response = await activatePolicyBundleVersion(client, {
        bundleName: bundle.bundleName,
        versionId,
        version,
      });

      return createToolResult(true, {
        action,
        message: `Version "${response.version.version}" is now live for bundle "${response.bundle.bundleName}".`,
        bundle: response.bundle,
        version: response.version,
      });
    },
  });
}
