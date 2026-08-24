import { createToolResult, defineTool, z } from '@transcend-io/mcp-server-base';

import { publishPolicyBundle } from '../helpers/policyCliOperations.js';
import { createPolicyEngineClient, type PolicyToolClients } from '../helpers/policyContext.js';
import { resolveBundle } from '../helpers/resolveBundle.js';

export const PolicyPublishSchema = z
  .object({
    dir: z
      .string()
      .optional()
      .describe('Local directory with manifest.json + .rego (mutually exclusive with files)'),
    files: z
      .record(z.string(), z.string())
      .optional()
      .describe(
        'Path → contents map (policy_help templateFiles.files). Mutually exclusive with dir.',
      ),
    bundleName: z.string().describe('Tenant-unique policy bundle name'),
    version: z
      .string()
      .optional()
      .describe('Version label (defaults to {bundleName}-yyyy-mm-dd-hh-mm-ss)'),
    description: z.string().optional().describe('Optional description for the uploaded version'),
  })
  .refine((data) => Boolean(data.dir) !== (data.files !== undefined), {
    message: 'Provide exactly one of dir or files.',
  });
export type PolicyPublishInput = z.infer<typeof PolicyPublishSchema>;

export function createPolicyPublishTool(clients: PolicyToolClients) {
  return defineTool({
    name: 'policy_publish',
    description:
      'Upload an inert Policy Engine version from files (in-memory map) or dir. ' +
      'Not live until policy_set_live activate. Requires Manage Policy scope (included in Activate).',
    category: 'Policy Engine',
    readOnly: false,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    zodSchema: PolicyPublishSchema,
    handler: async ({ dir, files, bundleName, version, description }) => {
      const client = createPolicyEngineClient(clients);
      const response = await publishPolicyBundle(client, {
        dir,
        files,
        bundleName,
        version,
        description,
      });

      const uploadedVersion = response.version;
      const bundle =
        'bundle' in response ? response.bundle : await resolveBundle(client, { bundleName });

      return createToolResult(true, {
        message: 'Uploaded inert version. Call policy_set_live with action "activate" to go live.',
        bundle,
        version: uploadedVersion,
      });
    },
  });
}
