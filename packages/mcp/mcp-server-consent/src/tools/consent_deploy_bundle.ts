import {
  createGraphqlRequestClient,
  createToolResult,
  defineTool,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import { ConsentBundleType } from '@transcend-io/privacy-types';
import {
  DEPLOY_CONSENT_MANAGER,
  diffConsentBundleDeploy,
  fetchConsentBundleDeployDiff,
  summarizeConsentBundleDeployDiff,
} from '@transcend-io/sdk';

import { resolveAirgapBundleId } from '../resolveAirgapBundleId.js';

export const DeployBundleSchema = z.object({
  environment: z
    .enum(Object.values(ConsentBundleType) as [ConsentBundleType, ...ConsentBundleType[]])
    .describe('Bundle to deploy: TEST (/cm-test) or PRODUCTION (live /cm). Required.'),
});
export type DeployBundleInput = z.infer<typeof DeployBundleSchema>;

/**
 * Deploy the saved consent manager (Airgap) configuration as the TEST or PRODUCTION bundle.
 */
export function createConsentDeployBundleTool(clients: ToolClients) {
  return defineTool({
    name: 'consent_deploy_bundle',
    description:
      'Deploy (publish, release) the saved consent manager Airgap bundle. TEST updates /cm-test; ' +
      'PRODUCTION updates the live /cm bundle that site visitors load. Use consent_preview_deploy for a diff. ' +
      'Requires Manage Consent Manager scope.',
    category: 'Consent Management',
    readOnly: false,
    confirmation: {
      hint:
        'Deploys the saved consent manager configuration as a new Airgap bundle for this ' +
        'organization and replaces the bundle currently served for that environment. TEST ' +
        'updates /cm-test. PRODUCTION updates /cm, which real site visitors load right away. ' +
        'Check environment in the call arguments before agreeing.',
      describe: async (args) => {
        const environment = args.environment;
        if (
          environment !== ConsentBundleType.Test &&
          environment !== ConsentBundleType.Production
        ) {
          return undefined;
        }
        const airgapBundleId = await resolveAirgapBundleId(clients.graphql);
        const client = createGraphqlRequestClient(clients.graphql);
        const inputs = await fetchConsentBundleDeployDiff(client, {
          airgapBundleId,
          bundleType: environment,
        });
        const diff = diffConsentBundleDeploy(inputs);
        return summarizeConsentBundleDeployDiff(diff, environment);
      },
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    zodSchema: DeployBundleSchema,
    handler: async ({ environment }) => {
      const airgapBundleId = await resolveAirgapBundleId(clients.graphql);
      await clients.graphql.makeRequest(DEPLOY_CONSENT_MANAGER, {
        airgapBundleId,
        bundleType: environment,
      });
      return createToolResult(true, {
        deployed: true,
        environment,
        airgapBundleId,
      });
    },
  });
}
