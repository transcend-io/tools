import {
  createCollectedLogger,
  createGraphqlRequestClient,
  createListResult,
  defineTool,
  OffsetPaginationSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import { fetchAllPolicies } from '@transcend-io/sdk';

export const ListPoliciesSchema = OffsetPaginationSchema.extend({
  includeContent: z
    .boolean()
    .optional()
    .describe('Include the text of the latest version of each policy. Defaults to false.'),
});
export type ListPoliciesInput = z.infer<typeof ListPoliciesSchema>;

export function createPrivacyCenterListPoliciesTool(clients: ToolClients) {
  return defineTool({
    name: 'privacy_center_list_policies',
    description:
      'List the privacy center policies (privacy policy, cookie policy, custom pages). Same as ' +
      'the policies section of `transcend inventory pull`. Not the policy engine bundles: use ' +
      'the policy_* tools for those. Policy text is left out unless includeContent is true.',
    category: 'Privacy Center',
    readOnly: true,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    zodSchema: ListPoliciesSchema,
    handler: async ({ limit, offset, includeContent = false }) => {
      const { logger } = createCollectedLogger();
      const all = await fetchAllPolicies(createGraphqlRequestClient(clients.graphql), { logger });
      const page = all.slice(offset, offset + limit).map((policy) => ({
        id: policy.id,
        title: policy.title.defaultMessage,
        type: policy.type,
        disabledLocales: policy.disabledLocales,
        versionCount: policy.versions.length,
        ...(includeContent && { content: policy.versions[0]?.content.defaultMessage }),
      }));
      return createListResult(page, {
        totalCount: all.length,
        hasNextPage: offset + limit < all.length,
      });
    },
  });
}
