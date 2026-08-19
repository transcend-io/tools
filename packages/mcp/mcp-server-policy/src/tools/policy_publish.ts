import { createToolResult, defineTool, z } from '@transcend-io/mcp-server-base';

import { publishPolicyBundle } from '../helpers/policyCliOperations.js';
import { createPolicyEngineClient, type PolicyToolClients } from '../helpers/policyContext.js';
import { resolveBundle } from '../helpers/resolveBundle.js';

export const PolicyPublishSchema = z.object({
  dir: z
    .string()
    .describe(
      'Absolute or workspace-relative directory containing manifest.json and publishable .rego files',
    ),
  bundleName: z.string().describe('Tenant-unique policy bundle name'),
  version: z
    .string()
    .optional()
    .describe('Version label (defaults to {bundleName}-yyyy-mm-dd-hh-mm-ss)'),
  description: z.string().optional().describe('Optional description for the uploaded version'),
});
export type PolicyPublishInput = z.infer<typeof PolicyPublishSchema>;

export function createPolicyPublishTool(clients: PolicyToolClients) {
  return defineTool({
    name: 'policy_publish',
    description:
      'Upload an inert Policy Engine version from a local directory (manifest.json + .rego, no *_test.rego). ' +
      'Creates the bundle on first upload. The version is NOT live until policy_set_live. ' +
      'Mirrors transcend policy publish. Requires Manage Policy scope (included in Activate scope).',
    category: 'Policy Engine',
    readOnly: false,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    zodSchema: PolicyPublishSchema,
    handler: async ({ dir, bundleName, version, description }) => {
      const client = createPolicyEngineClient(clients);
      const response = await publishPolicyBundle(client, {
        dir,
        bundleName,
        version,
        description,
      });

      const uploadedVersion = response.version;
      const resolvedBundleId =
        'bundle' in response
          ? response.bundle.id
          : (await resolveBundle(client, { bundleName })).id;

      return createToolResult(true, {
        message:
          'Policy version uploaded successfully. It is inert until you call policy_set_live with action "activate".',
        bundleId: resolvedBundleId,
        bundleName,
        versionId: uploadedVersion.id,
        versionLabel: uploadedVersion.version,
        sha256: uploadedVersion.sha256,
        sizeBytes: uploadedVersion.sizeBytes,
        createdAt: uploadedVersion.createdAt,
        ...('bundle' in response ? { bundle: response.bundle } : {}),
        version: uploadedVersion,
      });
    },
  });
}
