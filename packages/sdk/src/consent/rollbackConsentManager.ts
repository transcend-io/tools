import { ConsentBundleType } from '@transcend-io/privacy-types';
import type { Logger } from '@transcend-io/utils';
import type { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import {
  AIRGAP_BUNDLE_ROLLBACK_FIELDS,
  AIRGAP_BUNDLE_ROLLBACK_VERSIONS,
  ROLLBACK_AIRGAP_BUNDLE,
  type TranscendCliAirgapBundleRollbackVersionNode,
  type TranscendCliAirgapBundleRollbackVersionsResponse,
} from './gqls/consentManager.js';

/** Max number of deploy history entries to search for a rollback target */
const MAX_VERSIONS_TO_SEARCH = 50;

/** A deployed version that a bundle can roll back to */
export interface ConsentManagerRollbackTarget {
  /** airgap.js version of the target */
  version: string;
  /** When the target was deployed */
  deployedAt: string;
  /** Input for the rollbackAirgapBundle mutation */
  input: Record<string, string | boolean>;
}

/**
 * Build the rollbackAirgapBundle input from a deployed version.
 * Copies every module version the mutation accepts and drops empty ones.
 *
 * @param node - Deployed version node
 * @returns Mutation input
 */
export function buildRollbackInputFromVersion(
  node: TranscendCliAirgapBundleRollbackVersionNode,
): Record<string, string | boolean> {
  const input: Record<string, string | boolean> = {};
  for (const field of AIRGAP_BUNDLE_ROLLBACK_FIELDS) {
    const value = node[field];
    if (value !== null && value !== undefined) {
      input[field] = value;
    }
  }
  return input;
}

/**
 * Find a previously deployed version to roll back to.
 * The newest entry is the live deploy, so it is never a valid target.
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns The rollback target
 */
export async function fetchConsentManagerRollbackTarget(
  client: GraphQLClient,
  options: {
    /** ID of Consent Manager */
    id: string;
    /** Type of bundle */
    bundleType: ConsentBundleType;
    /** airgap.js version to roll back to */
    version: string;
    /** Logger instance */
    logger?: Logger;
  },
): Promise<ConsentManagerRollbackTarget> {
  const { id, bundleType, version, logger } = options;
  const {
    airgapBundleVersions: { nodes },
  } = await makeGraphQLRequest<TranscendCliAirgapBundleRollbackVersionsResponse>(
    client,
    AIRGAP_BUNDLE_ROLLBACK_VERSIONS,
    {
      variables: {
        id,
        first: MAX_VERSIONS_TO_SEARCH,
        input: { isTest: bundleType === ConsentBundleType.Test },
      },
      logger,
    },
  );

  const [live, ...previous] = nodes;
  const target = previous.find((node) => node.version === version);
  if (!target) {
    const available = previous
      .map((node) => node.version)
      .filter((v, i, all): v is string => !!v && all.indexOf(v) === i);
    const liveNote = live?.version === version ? ` Version "${version}" is already live.` : '';
    throw new Error(
      `No earlier ${bundleType} deploy found with airgap.js version "${version}".${liveNote} ` +
        `Available versions: ${available.length > 0 ? available.join(', ') : 'none'}.`,
    );
  }

  return {
    version,
    deployedAt: target.createdAt,
    input: buildRollbackInputFromVersion(target),
  };
}

/**
 * Run the rollback mutation for a target that was already fetched
 *
 * @param client - GraphQL client
 * @param options - Options
 */
export async function rollbackConsentManagerToTarget(
  client: GraphQLClient,
  options: {
    /** ID of Consent Manager */
    id: string;
    /** Target from {@link fetchConsentManagerRollbackTarget} */
    target: ConsentManagerRollbackTarget;
    /** Logger instance */
    logger?: Logger;
  },
): Promise<void> {
  const { rollbackAirgapBundle } = await makeGraphQLRequest<{
    /** Mutation payload */
    rollbackAirgapBundle: {
      /** Whether the rollback was accepted */
      success: boolean;
    };
  }>(client, ROLLBACK_AIRGAP_BUNDLE, {
    variables: { id: options.id, input: options.target.input },
    logger: options.logger,
  });
  if (!rollbackAirgapBundle.success) {
    throw new Error(`Rollback to airgap.js version "${options.target.version}" was not accepted.`);
  }
}

/**
 * Roll a consent manager bundle back to a previously deployed airgap.js version
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns The version rolled back to
 */
export async function rollbackConsentManager(
  client: GraphQLClient,
  options: {
    /** ID of Consent Manager */
    id: string;
    /** Type of bundle */
    bundleType: ConsentBundleType;
    /** airgap.js version to roll back to */
    version: string;
    /** Logger instance */
    logger?: Logger;
  },
): Promise<ConsentManagerRollbackTarget> {
  const target = await fetchConsentManagerRollbackTarget(client, options);
  await rollbackConsentManagerToTarget(client, {
    id: options.id,
    target,
    logger: options.logger,
  });
  return target;
}
