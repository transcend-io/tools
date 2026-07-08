import { type Logger } from '@transcend-io/utils';
import type { GraphQLClient } from 'graphql-request';
import { keyBy } from 'lodash-es';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { fetchAllPurposes } from './fetchAllPurposes.js';
import { CREATE_PURPOSE, UPDATE_PURPOSE } from './gqls/purpose.js';
import type { ConsentPurpose } from './transcendYmlCodecs.js';

export interface SyncPurposesResult {
  /** Whether every purpose synced without error */
  success: boolean;
  /** Map from purpose trackingType to its ID (used to sync nested preference topics) */
  purposeIdByTrackingType: Record<string, string>;
}

/**
 * Sync tracking purposes to Transcend, matching existing purposes by trackingType.
 * Creates purposes that do not yet exist and updates the rest.
 *
 * @param client - GraphQL client
 * @param purposes - Purpose inputs from YAML
 * @param options - Options
 * @returns Whether the sync succeeded and a trackingType -> purpose ID map
 */
export async function syncPurposes(
  client: GraphQLClient,
  purposes: ConsentPurpose[],
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<SyncPurposesResult> {
  const { logger } = options;
  logger?.info(`Syncing "${purposes.length}" purposes...`);

  const existing = await fetchAllPurposes(client, { logger });
  const existingByTrackingType = keyBy(existing, 'trackingType');
  const purposeIdByTrackingType: Record<string, string> = Object.fromEntries(
    existing.map(({ trackingType, id }) => [trackingType, id]),
  );

  let success = true;
  for (const purpose of purposes) {
    const found = existingByTrackingType[purpose.trackingType];
    try {
      if (found) {
        await makeGraphQLRequest(client, UPDATE_PURPOSE, {
          variables: {
            input: {
              id: found.id,
              name: purpose.name,
              title: purpose.title,
              description: purpose.description,
              isActive: purpose['is-active'],
              configurable: purpose.configurable,
              displayOrder: purpose['display-order'],
              showInPrivacyCenter: purpose['show-in-privacy-center'],
              showInConsentManager: purpose['show-in-consent-manager'],
              authLevel: purpose['auth-level'],
              optOutSignals: purpose['opt-out-signals'],
            },
          },
          logger,
        });
        purposeIdByTrackingType[purpose.trackingType] = found.id;
      } else {
        const {
          createPurpose: { purpose: created },
        } = await makeGraphQLRequest<{
          /** createPurpose mutation */
          createPurpose: {
            /** Created purpose */
            purpose: {
              /** ID */
              id: string;
              /** Slug */
              trackingType: string;
            };
          };
        }>(client, CREATE_PURPOSE, {
          variables: {
            input: {
              name: purpose.name,
              description: purpose.description ?? '',
              trackingType: purpose.trackingType,
              isActive: purpose['is-active'],
              configurable: purpose.configurable,
              displayOrder: purpose['display-order'],
              showInPrivacyCenter: purpose['show-in-privacy-center'],
              showInConsentManager: purpose['show-in-consent-manager'],
              authLevel: purpose['auth-level'],
              optOutSignals: purpose['opt-out-signals'],
            },
          },
          logger,
        });
        purposeIdByTrackingType[purpose.trackingType] = created.id;

        // `title` can only be set via updatePurpose (not createPurpose)
        if (purpose.title !== undefined) {
          await makeGraphQLRequest(client, UPDATE_PURPOSE, {
            variables: { input: { id: created.id, title: purpose.title } },
            logger,
          });
        }
      }
    } catch (err) {
      success = false;
      logger?.error(
        `Failed to sync purpose "${purpose.trackingType}"! - ${(err as Error).message}`,
      );
    }
  }

  if (success) {
    logger?.info(`Successfully synced "${purposes.length}" purposes!`);
  }
  return { success, purposeIdByTrackingType };
}
