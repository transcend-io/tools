import {
  createCollectedLogger,
  createGraphqlRequestClient,
  defineTool,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import { RequestAction } from '@transcend-io/privacy-types';
import { fetchAllActions } from '@transcend-io/sdk';

export const listActionsSchema = z.object({});
export type ListActionsInput = z.infer<typeof listActionsSchema>;

export function createDsrListActionsTool(clients: ToolClients) {
  return defineTool({
    name: 'dsr_list_actions',
    description:
      'List the request action settings (the `actions` section of transcend.yml), one per ' +
      'request type such as ACCESS or ERASURE, in transcend.yml shape. Same data as ' +
      '`transcend inventory pull --resources=actions`.',
    category: 'DSR Automation',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: listActionsSchema,
    handler: async () => {
      const { logger } = createCollectedLogger();
      const actions = await fetchAllActions(createGraphqlRequestClient(clients.graphql), {
        logger,
      });
      const data = actions.map((action) => ({
        type: action.type,
        ...(action.type === RequestAction.Erasure
          ? {
              skipSecondaryIfNoFiles: action.skipSecondaryIfNoFiles,
              skipDownloadableStep: action.skipDownloadableStep,
            }
          : {}),
        requiresReview: action.requiresReview,
        waitingPeriod: action.waitingPeriod,
        regionDetectionMethod: action.regionDetectionMethod,
        regionList: action.regionList.length > 0 ? action.regionList : undefined,
      }));
      return { count: data.length, actions: data };
    },
  });
}
