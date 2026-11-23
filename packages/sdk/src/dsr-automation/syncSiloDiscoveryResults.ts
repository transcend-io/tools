import { mapSeries, type Logger } from '@transcend-io/utils';
import type { GraphQLClient } from 'graphql-request';
import { chunk, keyBy } from 'lodash-es';

import { makeGraphQLRequest, NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
import type { SiloDiscoveryResultInput } from '../transcend-yml/codecs.js';
import {
  type SiloDiscoveryResult,
  fetchAllSiloDiscoveryResults,
} from './fetchAllSiloDiscoveryResults.js';
import {
  MARK_DATA_SILO_DISCOVERY_RESULTS_JUNK,
  UPDATE_DATA_SILO_DISCOVERY_RESULTS,
} from './gqls/siloDiscoveryResult.js';

const CHUNK_SIZE = 50;

/** Composite key used to match YAML rows to remote discovery results */
export function siloDiscoveryResultKey(resourceId: string, pluginTitle: string): string {
  return `${resourceId}::${pluginTitle}`;
}

function remotePluginTitle(result: SiloDiscoveryResult): string {
  return result.plugin.dataSilo.title;
}

/**
 * Apply transcend.yml `system-discovery` updates to existing discovery results.
 *
 * Rows match on `resourceId` and `plugin` (data silo title). Only rows that already
 * exist in the org are updated. Title and `suggestedCatalog` map to
 * `updateDataSiloDiscoveryResults`. `status: IGNORED` uses `markDataSiloDiscoveryResultsJunk`.
 * Other status values cannot be set via GraphQL today.
 */
export async function syncSiloDiscoveryResults(
  client: GraphQLClient,
  results: SiloDiscoveryResultInput[],
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<boolean> {
  const { logger = NOOP_LOGGER } = options;
  if (results.length === 0) {
    return true;
  }

  logger.info(`Syncing ${results.length} system discovery results...`);

  try {
    const remoteResults = await fetchAllSiloDiscoveryResults(client, { logger });
    const remoteByKey = keyBy(remoteResults, (result) =>
      siloDiscoveryResultKey(result.resourceId, remotePluginTitle(result)),
    );

    const updates: { id: string; title?: string; suggestedDataSiloType?: string }[] = [];
    const junkIds: string[] = [];

    await mapSeries(results, async (input) => {
      const key = siloDiscoveryResultKey(input.resourceId, input.plugin);
      const remote = remoteByKey[key];
      if (!remote) {
        logger.warn(
          `Skipping system-discovery row with no remote match for resourceId="${input.resourceId}" plugin="${input.plugin}"`,
        );
        return;
      }

      const desiredTitle = input.title === null ? undefined : input.title;
      const remoteTitle = remote.title === null ? undefined : remote.title;
      const remoteCatalog = remote.suggestedCatalog?.title;

      const mutationInput: { id: string; title?: string; suggestedDataSiloType?: string } = {
        id: remote.id,
      };
      let needsUpdate = false;

      if (desiredTitle !== undefined && desiredTitle !== remoteTitle) {
        mutationInput.title = desiredTitle;
        needsUpdate = true;
      }

      if (
        input.suggestedCatalog &&
        input.suggestedCatalog !== remoteCatalog &&
        input.suggestedCatalog !== ''
      ) {
        mutationInput.suggestedDataSiloType = input.suggestedCatalog;
        needsUpdate = true;
      }

      if (needsUpdate) {
        updates.push(mutationInput);
      }

      if (input.status === 'IGNORED' && remote.status !== 'IGNORED') {
        junkIds.push(remote.id);
      } else if (input.status !== remote.status) {
        logger.warn(
          `Cannot sync status "${input.status}" for resourceId="${input.resourceId}" (remote is "${remote.status}")`,
        );
      }
    });

    await mapSeries(chunk(updates, CHUNK_SIZE), async (page) => {
      await makeGraphQLRequest(client, UPDATE_DATA_SILO_DISCOVERY_RESULTS, {
        variables: { input: page },
        logger,
      });
    });

    if (junkIds.length > 0) {
      await makeGraphQLRequest(client, MARK_DATA_SILO_DISCOVERY_RESULTS_JUNK, {
        variables: { input: junkIds.map((id) => ({ id })) },
        logger,
      });
    }

    logger.info(
      `Synced system discovery: ${updates.length} field update(s), ${junkIds.length} ignored.`,
    );
    return true;
  } catch (err) {
    logger.error(`Failed to sync system-discovery: ${(err as Error).message}`);
    return false;
  }
}
