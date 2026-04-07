import type { LocaleValue } from '@transcend-io/internationalization';
import { mapSeries, type Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';
import { chunk, keyBy } from 'lodash-es';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { fetchAllPolicies } from './fetchAllPolicies.js';
import { fetchPrivacyCenterId } from './fetchPrivacyCenterId.js';
import { UPDATE_POLICIES } from './gqls/policy.js';

export interface PolicyInput {
  /** The title of the policy */
  title: string;
  /** Effective date of policy */
  effectiveOn?: string;
  /** Whether or not to disable the effective date */
  disableEffectiveOn?: boolean;
  /** Content of the policy */
  content?: string;
  /** The languages for which the policy is disabled for */
  disabledLocales?: LocaleValue[];
}

const MAX_PAGE_SIZE = 100;

/**
 * Update or create policies
 *
 * @param client - GraphQL client
 * @param policyInputs - List of policy input
 * @param options - Options
 */
export async function updatePolicies(
  client: GraphQLClient,
  policyInputs: [PolicyInput, string | undefined][],
  options: {
    /** Logger instance */
    logger: Logger;
  },
): Promise<void> {
  const { logger } = options;
  const privacyCenterId = await fetchPrivacyCenterId(client, { logger });

  await mapSeries(chunk(policyInputs, MAX_PAGE_SIZE), async (page) => {
    await makeGraphQLRequest(client, UPDATE_POLICIES, {
      variables: {
        privacyCenterId,
        policies: page.map(([policy, policyId]) => ({
          id: policyId,
          title: policy.title,
          disableEffectiveOn: policy.disableEffectiveOn,
          disabledLocales: policy.disabledLocales,
          ...(policy.effectiveOn || policy.content
            ? {
                version: {
                  ...(policy.effectiveOn ? { effectiveOn: policy.effectiveOn } : {}),
                  ...(policy.content
                    ? {
                        content: {
                          defaultMessage: policy.content,
                        },
                      }
                    : {}),
                },
              }
            : {}),
        })),
      },
      logger,
    });
  });
}

/**
 * Sync the set of policies from the YML interface into the product
 *
 * @param client - GraphQL client
 * @param policies - policies to sync
 * @param options - Options
 * @returns True upon success, false upon failure
 */
export async function syncPolicies(
  client: GraphQLClient,
  policies: PolicyInput[],
  options: {
    /** Logger instance */
    logger: Logger;
  },
): Promise<boolean> {
  const { logger } = options;
  let encounteredError = false;
  logger.info(`Syncing "${policies.length}" policies...`);

  const notUnique = policies.filter(
    (policy) => policies.filter((pol) => policy.title === pol.title).length > 1,
  );
  if (notUnique.length > 0) {
    throw new Error(
      `Failed to upload policies as there were non-unique entries found: ${notUnique
        .map(({ title }) => title)
        .join(',')}`,
    );
  }

  const existingPolicies = await fetchAllPolicies(client, { logger });
  const policiesById = keyBy(existingPolicies, ({ title }) => title.defaultMessage);

  try {
    logger.info(`Upserting "${policies.length}" new policies...`);
    await updatePolicies(
      client,
      policies.map((policy) => [policy, policiesById[policy.title]?.id]),
      { logger },
    );
    logger.info(`Successfully synced ${policies.length} policies!`);
  } catch (err) {
    encounteredError = true;
    logger.error(`Failed to create policies! - ${(err as Error).message}`);
  }

  return !encounteredError;
}
