import { CodePackageType } from '@transcend-io/privacy-types';
import { mapSeries, map, type Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';
import { chunk, keyBy } from 'lodash-es';

import { makeGraphQLRequest, NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
import {
  fetchAllSoftwareDevelopmentKits,
  SoftwareDevelopmentKit,
} from './fetchAllSoftwareDevelopmentKits.js';
import {
  UPDATE_SOFTWARE_DEVELOPMENT_KITS,
  CREATE_SOFTWARE_DEVELOPMENT_KIT,
} from './gqls/softwareDevelopmentKit.js';

export interface SoftwareDevelopmentKitInput {
  /** Title of software development kit */
  name: string;
  /** Code package type */
  codePackageType: CodePackageType;
  /** Description of the SDK */
  description?: string;
  /** Github repository URL */
  repositoryUrl?: string;
  /** Integration name */
  catalogIntegrationName?: string;
  /** Documentation links */
  documentationLinks?: string[];
}

const CHUNK_SIZE = 100;

/**
 * Create a new software development kit
 *
 * @param client - GraphQL client
 * @param input - Software development kit input
 * @param options - Options
 * @returns Created software development kit
 */
export async function createSoftwareDevelopmentKit(
  client: GraphQLClient,
  input: {
    /** Title of software development kit */
    name: string;
    /** Code package type */
    codePackageType: CodePackageType;
    /** Description of the SDK */
    description?: string;
    /** Github repository */
    repositoryUrl?: string;
    /** Integration name */
    catalogIntegrationName?: string;
    /** Doc links */
    documentationLinks?: string[];
    /** Code package IDs */
    codePackageIds?: string[];
    /** Code package names */
    codePackageNames?: string[];
    /** User IDs of owners */
    ownerIds?: string[];
    /** Emails of owners */
    ownerEmails?: string[];
    /** Team IDs */
    teamIds?: string[];
    /** Team names */
    teamNames?: string[];
  },
  options: {
    /** Logger instance */
    logger?: Logger;
  },
): Promise<SoftwareDevelopmentKit> {
  const { logger = NOOP_LOGGER } = options;
  const {
    createSoftwareDevelopmentKit: { softwareDevelopmentKit },
  } = await makeGraphQLRequest<{
    /** createSoftwareDevelopmentKit mutation */
    createSoftwareDevelopmentKit: {
      /** Software development kit */
      softwareDevelopmentKit: SoftwareDevelopmentKit;
    };
  }>(client, CREATE_SOFTWARE_DEVELOPMENT_KIT, {
    variables: { input },
    logger,
  });
  logger.info(`Successfully created software development kit "${input.name}"!`);
  return softwareDevelopmentKit;
}

/**
 * Update an existing software development kit
 *
 * @param client - GraphQL client
 * @param inputs - Software development kit input
 * @param options - Options
 * @returns Updated software development kits
 */
export async function updateSoftwareDevelopmentKits(
  client: GraphQLClient,
  inputs: {
    /** ID of software development kit */
    id: string;
    /** Title of software development kit */
    name?: string;
    /** Description of the SDK */
    description?: string;
    /** Github repository */
    repositoryUrl?: string;
    /** Integration name */
    catalogIntegrationName?: string;
    /** Doc links */
    documentationLinks?: string[];
    /** Code package IDs */
    codePackageIds?: string[];
    /** Code package names */
    codePackageNames?: string[];
    /** User IDs of owners */
    ownerIds?: string[];
    /** Emails of owners */
    ownerEmails?: string[];
    /** Team IDs */
    teamIds?: string[];
    /** Team names */
    teamNames?: string[];
  }[],
  options: {
    /** Logger instance */
    logger?: Logger;
  },
): Promise<SoftwareDevelopmentKit[]> {
  const { logger = NOOP_LOGGER } = options;
  const {
    updateSoftwareDevelopmentKits: { softwareDevelopmentKits },
  } = await makeGraphQLRequest<{
    /** updateSoftwareDevelopmentKits mutation */
    updateSoftwareDevelopmentKits: {
      /** Software development kit */
      softwareDevelopmentKits: SoftwareDevelopmentKit[];
    };
  }>(client, UPDATE_SOFTWARE_DEVELOPMENT_KITS, {
    variables: {
      input: {
        softwareDevelopmentKits: inputs,
      },
    },
    logger,
  });
  logger.info(`Successfully updated ${inputs.length} software development kits!`);
  return softwareDevelopmentKits;
}

/**
 * Sync the software development kits
 *
 * @param client - GraphQL client
 * @param softwareDevelopmentKits - Software development kits
 * @param options - Options
 * @returns The software development kits that were upserted and whether the sync was successful
 */
export async function syncSoftwareDevelopmentKits(
  client: GraphQLClient,
  softwareDevelopmentKits: SoftwareDevelopmentKitInput[],
  options: {
    /** Logger instance */
    logger?: Logger;
    /** Concurrency */
    concurrency?: number;
  },
): Promise<{
  /** The SDKs that were upserted */
  softwareDevelopmentKits: SoftwareDevelopmentKit[];
  /** If successful */
  success: boolean;
}> {
  const { logger = NOOP_LOGGER, concurrency = 20 } = options;
  let encounteredError = false;
  const sdks: SoftwareDevelopmentKit[] = [];
  logger.info('Syncing software development kits...');

  // Index existing software development kits
  const existing = await fetchAllSoftwareDevelopmentKits(client, { logger });
  const softwareDevelopmentKitByTitle = keyBy(existing, ({ name, codePackageType }) =>
    JSON.stringify({ name, codePackageType }),
  );

  // Determine which software development kits are new vs existing
  const mapSoftwareDevelopmentKitsToExisting = softwareDevelopmentKits.map((sdkInput) => [
    sdkInput,
    softwareDevelopmentKitByTitle[
      JSON.stringify({
        name: sdkInput.name,
        codePackageType: sdkInput.codePackageType,
      })
    ]?.id,
  ]);

  // Create the new software development kits
  const newSoftwareDevelopmentKits = mapSoftwareDevelopmentKitsToExisting
    .filter(([, existing]) => !existing)
    .map(([sdkInput]) => sdkInput as SoftwareDevelopmentKitInput);
  try {
    logger.info(`Creating "${newSoftwareDevelopmentKits.length}" new software development kits...`);
    await map(
      newSoftwareDevelopmentKits,
      async (sdk) => {
        const newSdk = await createSoftwareDevelopmentKit(client, sdk, { logger });
        sdks.push(newSdk);
      },
      {
        concurrency,
      },
    );
    logger.info(
      `Successfully synced ${newSoftwareDevelopmentKits.length} software development kits!`,
    );
  } catch (err) {
    encounteredError = true;
    logger.error(`Failed to create software development kits! - ${(err as Error).message}`);
  }

  // Update existing software development kits
  const existingSoftwareDevelopmentKits = mapSoftwareDevelopmentKitsToExisting.filter(
    (x): x is [SoftwareDevelopmentKitInput, string] => !!x[1],
  );
  const chunks = chunk(existingSoftwareDevelopmentKits, CHUNK_SIZE);
  logger.info(`Updating "${existingSoftwareDevelopmentKits.length}" software development kits...`);

  await mapSeries(chunks, async (chunk) => {
    try {
      const updatedSdks = await updateSoftwareDevelopmentKits(
        client,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        chunk.map(([{ codePackageType, ...input }, id]) => ({
          ...input,
          id,
        })),
        { logger },
      );
      sdks.push(...updatedSdks);
      logger.info(
        `Successfully updated "${existingSoftwareDevelopmentKits.length}" software development kits!`,
      );
    } catch (err) {
      encounteredError = true;
      logger.error(`Failed to update software development kits! - ${(err as Error).message}`);
    }

    logger.info(`Synced "${softwareDevelopmentKits.length}" software development kits!`);
  });

  // Return true upon success
  return {
    softwareDevelopmentKits: sdks,
    success: !encounteredError,
  };
}
