import { KnownDefaultPurpose, type UserPrivacySignalEnum } from '@transcend-io/airgap.js-types';
import { type Logger } from '@transcend-io/utils';
import type { GraphQLClient } from 'graphql-request';
import { keyBy } from 'lodash-es';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { type PurposeInput } from './codecs.js';
import { fetchAllPurposes, type Purpose } from './fetchAllPurposes.js';
import { CREATE_PURPOSE, UPDATE_PURPOSE } from './gqls/purpose.js';

export type { PurposeInput } from './codecs.js';

export interface SyncPurposesResult {
  /** Whether every purpose synced without error */
  success: boolean;
  /** Map from purpose trackingType to its ID (used to sync nested preference topics) */
  purposeIdByTrackingType: Record<string, string>;
}

const DEFAULT_PURPOSE_TRACKING_TYPES: ReadonlySet<string> = new Set(
  Object.values(KnownDefaultPurpose),
);

/**
 * Whether a purpose tracking type is a built-in default purpose.
 *
 * @param trackingType - Purpose tracking type slug
 * @returns True when the purpose is a built-in default
 */
function isDefaultPurposeTrackingType(trackingType: string): boolean {
  return DEFAULT_PURPOSE_TRACKING_TYPES.has(trackingType);
}

/**
 * Compare opt-out signal lists regardless of order.
 *
 * @param left - First signal list
 * @param right - Second signal list
 * @returns True when both lists contain the same signals
 */
function optOutSignalsMatch(
  left: UserPrivacySignalEnum[] | undefined,
  right: UserPrivacySignalEnum[],
): boolean {
  const normalizedLeft = [...(left ?? [])].sort();
  const normalizedRight = [...right].sort();
  return (
    normalizedLeft.length === normalizedRight.length &&
    normalizedLeft.every((signal, index) => signal === normalizedRight[index])
  );
}

/**
 * Build updatePurpose input with only changed fields.
 * Built-in default purposes cannot sync `configurable` or `showInConsentManager`.
 *
 * @param found - Existing purpose from the API
 * @param input - Purpose input from YAML
 * @param options - Options
 * @returns Mutation input and any warnings for omitted default-purpose fields
 */
function buildUpdatePurposeInput(
  found: Purpose,
  input: PurposeInput,
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): { input: Record<string, unknown>; isEmpty: boolean } {
  const { logger } = options;
  const isDefault = isDefaultPurposeTrackingType(input.trackingType);
  const updateInput: Record<string, unknown> = { id: found.id };

  if (input.name !== found.name) {
    updateInput.name = input.name;
  }
  if (input.title !== found.title) {
    updateInput.title = input.title;
  }
  if (input.description !== found.description) {
    updateInput.description = input.description;
  }
  if (input['is-active'] !== found.isActive) {
    updateInput.isActive = input['is-active'];
  }
  if (input['display-order'] !== found.displayOrder) {
    updateInput.displayOrder = input['display-order'];
  }
  if (input['show-in-privacy-center'] !== found.showInPrivacyCenter) {
    updateInput.showInPrivacyCenter = input['show-in-privacy-center'];
  }
  if (input['auth-level'] !== found.authLevel) {
    updateInput.authLevel = input['auth-level'];
  }
  if (!optOutSignalsMatch(input['opt-out-signals'], found.optOutSignals)) {
    updateInput.optOutSignals = input['opt-out-signals'];
  }

  if (isDefault) {
    if (input.configurable !== found.configurable) {
      logger?.warn(
        `Cannot sync "configurable" for built-in purpose "${input.trackingType}" via API — ` +
          'update this field in the Admin Dashboard instead.',
      );
    }
    if (input['show-in-consent-manager'] !== found.showInConsentManager) {
      logger?.warn(
        `Cannot sync "show-in-consent-manager" for built-in purpose "${input.trackingType}" via API — ` +
          'update this field in the Admin Dashboard instead.',
      );
    }
  } else {
    if (input.configurable !== found.configurable) {
      updateInput.configurable = input.configurable;
    }
    if (input['show-in-consent-manager'] !== found.showInConsentManager) {
      updateInput.showInConsentManager = input['show-in-consent-manager'];
    }
  }

  const isEmpty = Object.keys(updateInput).length === 1;
  return { input: updateInput, isEmpty };
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
        const { input: updateInput, isEmpty } = buildUpdatePurposeInput(found, purpose, {
          logger,
        });
        if (isEmpty) {
          logger?.info(
            `Skipping purpose "${purpose.trackingType}" — only blocked fields differ for built-in purpose`,
          );
          purposeIdByTrackingType[purpose.trackingType] = found.id;
          continue;
        }

        await makeGraphQLRequest(client, UPDATE_PURPOSE, {
          variables: { input: updateInput },
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
