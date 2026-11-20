import {
  createGraphqlRequestClient,
  createToolResult,
  defineTool,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import { ConsentBundleType } from '@transcend-io/privacy-types';
import {
  diffConsentBundleDeploy,
  fetchConsentBundleDeployDiff,
  summarizeConsentBundleDeployDiff,
} from '@transcend-io/sdk';

import { resolveAirgapBundleId } from '../resolveAirgapBundleId.js';

export const PreviewDeploySchema = z.object({
  environment: z
    .enum(Object.values(ConsentBundleType) as [ConsentBundleType, ...ConsentBundleType[]])
    .describe('Bundle to preview: TEST (/cm-test) or PRODUCTION (live /cm). Required.'),
});
export type PreviewDeployInput = z.infer<typeof PreviewDeploySchema>;

export function createConsentPreviewDeployTool(clients: ToolClients) {
  return defineTool({
    name: 'consent_preview_deploy',
    description:
      'Dry-run preview for consent_deploy_bundle: module diffs like Review and Publish in the dashboard. ' +
      'Show patch output in chat before deploying.',
    category: 'Consent Management',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: PreviewDeploySchema,
    handler: async ({ environment }) => {
      const airgapBundleId = await resolveAirgapBundleId(clients.graphql);
      const client = createGraphqlRequestClient(clients.graphql);
      const inputs = await fetchConsentBundleDeployDiff(client, {
        airgapBundleId,
        bundleType: environment,
      });
      const diff = diffConsentBundleDeploy(inputs);
      const summary = summarizeConsentBundleDeployDiff(diff, environment);

      return createToolResult(true, {
        airgapBundleId,
        environment,
        firstDeploy: diff.firstDeploy,
        lastDeployedAt: diff.lastDeployedAt,
        hasChanges: diff.hasChanges,
        summary,
        modules: diff.modules.map((mod) => ({
          key: mod.key,
          changesMade: mod.changesMade,
          highlights: mod.highlights,
          patch: mod.patch,
          truncated: mod.truncated,
        })),
      });
    },
  });
}
