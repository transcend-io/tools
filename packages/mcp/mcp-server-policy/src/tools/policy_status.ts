import {
  createListResult,
  createToolResult,
  defineTool,
  OffsetPaginationSchema,
  z,
} from '@transcend-io/mcp-server-base';

import {
  getPolicyBundleVersion,
  listPolicyBundleVersions,
  listPolicyBundles,
} from '../helpers/policyCliOperations.js';
import { createPolicyEngineClient, type PolicyToolClients } from '../helpers/policyContext.js';
import { resolveBundle } from '../helpers/resolveBundle.js';

export const PolicyStatusSchema = OffsetPaginationSchema.extend({
  bundleId: z.string().uuid().optional().describe('Policy bundle UUID to inspect'),
  bundleName: z.string().optional().describe('Tenant-unique bundle name (alternative to bundleId)'),
  versionId: z
    .string()
    .uuid()
    .optional()
    .describe('When set with a bundle, returns that version metadata and downloadUrl'),
  after: z
    .string()
    .optional()
    .describe('Cursor for version history pagination (from a prior policy_status response)'),
});
export type PolicyStatusInput = z.infer<typeof PolicyStatusSchema>;

export function createPolicyStatusTool(clients: PolicyToolClients) {
  return defineTool({
    name: 'policy_status',
    description:
      'Discover Policy Engine bundles, version history, and download URLs. ' +
      'Mirrors transcend policy bundles / versions / download. Requires View Policy scope (included in Activate scope).',
    category: 'Policy Engine',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: PolicyStatusSchema,
    handler: async ({ first, offset, bundleId, bundleName, versionId, after }) => {
      const client = createPolicyEngineClient(clients);

      if (bundleId || bundleName) {
        const bundle = await resolveBundle(client, { bundleId, bundleName });

        if (versionId) {
          const detail = await getPolicyBundleVersion(client, versionId);
          if (detail.bundleName !== bundle.bundleName) {
            throw new Error(`Version id "${versionId}" was not found for this policy bundle.`);
          }
          return createToolResult(true, {
            bundle: {
              id: bundle.id,
              bundleName: bundle.bundleName,
              activeVersionId: bundle.activeVersionId,
              lastActivatedAt: bundle.lastActivatedAt,
            },
            version: detail,
            isActive: bundle.activeVersionId === versionId,
          });
        }

        const versions = await listPolicyBundleVersions(client, bundle.id, {
          limit: first,
          after,
        });

        const nodes = versions.nodes.map((version) => ({
          ...version,
          isActive: bundle.activeVersionId === version.id,
        }));

        return createToolResult(true, {
          bundle: {
            id: bundle.id,
            bundleName: bundle.bundleName,
            activeVersionId: bundle.activeVersionId,
            lastActivatedAt: bundle.lastActivatedAt,
          },
          versions: nodes,
          count: nodes.length,
          hasNextPage: versions.pageInfo.hasNextPage,
          nextCursor: versions.pageInfo.endCursor,
        });
      }

      const bundles = await listPolicyBundles(client, { limit: first, offset });
      const nodes = bundles.nodes.map((bundle) => ({
        id: bundle.id,
        bundleName: bundle.bundleName,
        activeVersionId: bundle.activeVersionId,
        lastActivatedAt: bundle.lastActivatedAt,
        createdAt: bundle.createdAt,
      }));

      const nextOffset =
        offset + nodes.length < bundles.totalCount ? offset + nodes.length : undefined;

      return createListResult(nodes, {
        totalCount: bundles.totalCount,
        hasNextPage: nextOffset !== undefined,
        cursor: nextOffset !== undefined ? String(nextOffset) : undefined,
        paginationNote:
          nextOffset !== undefined ? `Pass offset=${nextOffset} for the next page.` : undefined,
      });
    },
  });
}
