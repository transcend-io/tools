import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import { ConsentBundleType } from '@transcend-io/privacy-types';
import { deployConsentManager } from '@transcend-io/sdk';

import { resolveAirgapBundleId } from '../resolveAirgapBundleId.js';

export const DeployBundleSchema = z.object({
  environment: z
    .enum(Object.values(ConsentBundleType) as [ConsentBundleType, ...ConsentBundleType[]])
    .describe('Bundle to deploy: TEST (/cm-test) or PRODUCTION (live /cm). Required.'),
});
export type DeployBundleInput = z.infer<typeof DeployBundleSchema>;

type SdkGraphQLClient = Parameters<typeof deployConsentManager>[0];

/**
 * Adapt the MCP GraphQL client to the request shape the SDK expects.
 * Retries are left to the SDK helper so a failed deploy is not retried twice over.
 */
function toSdkGraphQLClient(graphql: ToolClients['graphql']): SdkGraphQLClient {
  return {
    request: (document: unknown, variables?: unknown) =>
      graphql.makeRequest(document as never, variables as never, { retries: 0 }),
  } as unknown as SdkGraphQLClient;
}

/**
 * Deploy the saved consent manager (Airgap) configuration as the TEST or PRODUCTION bundle.
 */
export function createConsentDeployBundleTool(clients: ToolClients) {
  return defineTool({
    name: 'consent_deploy_bundle',
    description:
      'Deploy (publish, release) the saved consent manager Airgap bundle. TEST updates /cm-test; ' +
      'PRODUCTION updates the live /cm bundle that site visitors load. Requires Manage Consent ' +
      'Manager scope.',
    category: 'Consent Management',
    readOnly: false,
    confirmation: {
      hint:
        'Deploys the saved consent manager configuration as a new Airgap bundle for this ' +
        'organization and replaces the bundle currently served for that environment. TEST ' +
        'updates /cm-test. PRODUCTION updates /cm, which real site visitors load right away. ' +
        'Check environment in the call arguments before agreeing.',
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    zodSchema: DeployBundleSchema,
    handler: async ({ environment }) => {
      const id = await resolveAirgapBundleId(clients.graphql);
      await deployConsentManager(toSdkGraphQLClient(clients.graphql), {
        id,
        bundleType: environment,
      });
      return createToolResult(true, {
        deployed: true,
        environment,
        airgapBundleId: id,
      });
    },
  });
}
