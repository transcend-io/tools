import type { UserPrivacySignalEnum } from '@transcend-io/airgap.js-types';
import type { PreferenceStoreAuthLevel } from '@transcend-io/privacy-types';
import { type Logger } from '@transcend-io/utils';
import type { GraphQLClient } from 'graphql-request';
import { keyBy } from 'lodash-es';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { fetchAllPurposes } from './fetchAllPurposes.js';
import { CREATE_PURPOSE, UPDATE_PURPOSE } from './gqls/purpose.js';

export interface PurposeInput {
  /** Purpose slug (immutable key used to match existing purposes) */
  trackingType: string;
  /** Display name of the purpose */
  name: string;
  /** Title shown in Consent Management and Privacy Center UIs */
  title?: string;
  /** Description of the purpose */
  description?: string;
  /** Whether the purpose is active */
  'is-active'?: boolean;
  /** Whether the purpose is configurable */
  configurable?: boolean;
  /** Display order of the purpose in the privacy center */
  'display-order'?: number;
  /** Whether the purpose is shown in the privacy center */
  'show-in-privacy-center'?: boolean;
  /** Whether the purpose is shown in the consent manager */
  'show-in-consent-manager'?: boolean;
  /** Authentication level required for the purpose */
  'auth-level'?: PreferenceStoreAuthLevel;
  /** Opt-out signals that instantly opt out of this purpose */
  'opt-out-signals'?: UserPrivacySignalEnum[];
  // NOTE: `default-consent` is not writable via createPurpose/updatePurpose and is pull-only.
}

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
  purposes: PurposeInput[],
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
