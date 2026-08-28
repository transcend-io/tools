import {
  createToolResult,
  defineTool,
  EmptySchema,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import {
  CONSENT_PARTITIONS,
  FETCH_CONSENT_MANAGER,
  type TranscendCliConsentPartitionsResponse,
  type TranscendCliFetchConsentManagerResponse,
  type TranscendConsentPartitionGql,
} from '@transcend-io/sdk';

export const ListPartitionsSchema = EmptySchema;
export type ListPartitionsInput = Record<string, never>;

const PAGE_SIZE = 50;

/** A Preference Store partition key agents can pass to preferences_* tools */
export interface PreferencePartitionRow {
  /** Value to pass as `partition` on preferences_* Sombra tools */
  partition: string;
  /** Human label; for the default row uses "Default (airgap bundle)" */
  name: string;
  /** "default" = bundle id path; "custom" = airgapPartitions row */
  type: 'default' | 'custom';
  /** True when this is consentManager.partition?.partition ?? consentManager.id */
  isEffectiveForConsentManager: boolean;
  /** Present only for custom rows — airgapPartition DB id (not the path key) */
  airgapPartitionId?: string;
}

async function fetchAllConsentPartitions(
  graphql: ToolClients['graphql'],
): Promise<TranscendConsentPartitionGql[]> {
  const partitions: TranscendConsentPartitionGql[] = [];
  let offset = 0;
  let shouldContinue = false;

  do {
    const data = await graphql.makeRequest<TranscendCliConsentPartitionsResponse>(
      CONSENT_PARTITIONS,
      { first: PAGE_SIZE, offset },
    );
    const { nodes } = data.consentPartitions;
    partitions.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return partitions;
}

export function createPreferencesListPartitionsTool(clients: ToolClients) {
  return defineTool({
    name: 'preferences_list_partitions',
    description:
      'List Preference Store partition keys for this organization. ' +
      'Call this before preferences_query / preferences_upsert / other preferences_* tools. ' +
      'Returns the default airgap-bundle partition and any custom partitions, plus ' +
      "effectivePartition (the consent manager's current partition). " +
      'Use partitions[].partition as the partition argument — not the organization id.',
    category: 'Preference Management',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListPartitionsSchema,
    handler: async (_args) => {
      const managerData =
        await clients.graphql.makeRequest<TranscendCliFetchConsentManagerResponse>(
          FETCH_CONSENT_MANAGER,
          {},
        );
      const manager = managerData.consentManager.consentManager;
      const effectivePartition = manager.partition?.partition ?? manager.id;

      const customNodes = await fetchAllConsentPartitions(clients.graphql);

      const partitions: PreferencePartitionRow[] = [
        {
          partition: manager.id,
          name: 'Default (airgap bundle)',
          type: 'default',
          isEffectiveForConsentManager: manager.id === effectivePartition,
        },
      ];

      for (const node of customNodes) {
        if (node.partition === manager.id) {
          continue;
        }
        partitions.push({
          partition: node.partition,
          name: node.name,
          type: 'custom',
          isEffectiveForConsentManager: node.partition === effectivePartition,
          airgapPartitionId: node.id,
        });
      }

      return createToolResult(true, {
        effectivePartition,
        partitions,
      });
    },
  });
}
