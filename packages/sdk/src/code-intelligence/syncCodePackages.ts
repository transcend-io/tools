import { CodePackageType } from '@transcend-io/privacy-types';
import { map, mapSeries, type Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';
import { chunk, uniq, keyBy, uniqBy } from 'lodash-es';

import { makeGraphQLRequest, NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
import { fetchAllCodePackages, type CodePackage } from './fetchAllCodePackages.js';
import { CREATE_CODE_PACKAGE, UPDATE_CODE_PACKAGES } from './gqls/codePackage.js';
import { syncRepositories, type RepositoryInput } from './syncRepositories.js';
import { syncSoftwareDevelopmentKits } from './syncSoftwareDevelopmentKits.js';

/**
 * Input for a code package to sync
 */
export interface CodePackageInput {
  /** The name of the package */
  name: string;
  /** Type of code package */
  type: CodePackageType;
  /** Relative path to code package within the repository */
  relativePath: string;
  /** Name of repository that the code packages are being uploaded to */
  repositoryName: string;
  /** Description of the code package */
  description?: string;
  /** Software development kits used by the package */
  softwareDevelopmentKits?: {
    /** Name of the SDK */
    name: string;
  }[];
  /** Names of the teams that manage the code package */
  teamNames?: string[];
  /** Emails of the owners that manage the code package */
  ownerEmails?: string[];
}

const CHUNK_SIZE = 100;

const LOOKUP_SPLIT_KEY = '%%%%';

/**
 * Create a new code package
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns Created code package
 */
export async function createCodePackage(
  client: GraphQLClient,
  options: {
    /** Code package input */
    input: {
      /** Name of package */
      name: string;
      /** Description of package */
      description?: string;
      /** Type of package */
      type: CodePackageType;
      /** Relative path to package */
      relativePath: string;
      /** Repository ID */
      repositoryId?: string;
      /** Name of repository */
      repositoryName?: string;
      /** IDs of SDKs */
      softwareDevelopmentKitIds?: string[];
      /** IDs of owners */
      ownerIds?: string[];
      /** Emails of owners */
      ownerEmails?: string[];
      /** IDs of teams */
      teamIds?: string[];
      /** Names of teams */
      teamNames?: string[];
    };
    /** Logger instance */
    logger?: Logger;
  },
): Promise<CodePackage> {
  const { input, logger = NOOP_LOGGER } = options;
  const {
    createCodePackage: { codePackage },
  } = await makeGraphQLRequest<{
    /** createCodePackage mutation */
    createCodePackage: {
      /** Code package */
      codePackage: CodePackage;
    };
  }>(client, CREATE_CODE_PACKAGE, {
    variables: { input },
    logger,
  });
  logger.info(`Successfully created code package "${input.name}"!`);
  return codePackage;
}

/**
 * Update existing code packages
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns Code packages that were updated
 */
export async function updateCodePackages(
  client: GraphQLClient,
  options: {
    /** Code package inputs to update */
    input: {
      /** ID of code package */
      id: string;
      /** Name of package */
      name: string;
      /** Description of package */
      description?: string;
      /** Type of package */
      type: CodePackageType;
      /** Relative path to package */
      relativePath: string;
      /** Repository ID */
      repositoryId?: string;
      /** Name of repository */
      repositoryName?: string;
      /** IDs of SDKs */
      softwareDevelopmentKitIds?: string[];
      /** IDs of owners */
      ownerIds?: string[];
      /** Emails of owners */
      ownerEmails?: string[];
      /** IDs of teams */
      teamIds?: string[];
      /** Names of teams */
      teamNames?: string[];
    }[];
    /** Logger instance */
    logger?: Logger;
  },
): Promise<CodePackage[]> {
  const { input: inputs, logger = NOOP_LOGGER } = options;
  const {
    updateCodePackages: { codePackages },
  } = await makeGraphQLRequest<{
    /** updateCodePackages mutation */
    updateCodePackages: {
      /** Code packages */
      codePackages: CodePackage[];
    };
  }>(client, UPDATE_CODE_PACKAGES, {
    variables: {
      input: {
        codePackages: inputs,
      },
    },
    logger,
  });
  logger.info(`Successfully updated ${inputs.length} code packages!`);
  return codePackages;
}

/**
 * Sync code packages: creates missing packages and updates existing ones.
 * Also ensures required repositories and software development kits exist.
 *
 * @param client - GraphQL client
 * @param codePackages - Code packages to sync
 * @param options - Options
 * @returns True if successful, false if any updates failed
 */
export async function syncCodePackages(
  client: GraphQLClient,
  codePackages: CodePackageInput[],
  options: {
    /** Concurrency for create operations */
    concurrency?: number;
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<boolean> {
  const { concurrency = 20, logger = NOOP_LOGGER } = options;
  let encounteredError = false;

  const [existingCodePackages, { softwareDevelopmentKits: existingSoftwareDevelopmentKits }] =
    await Promise.all([
      fetchAllCodePackages(client, { logger }),
      syncSoftwareDevelopmentKits(
        client,
        uniqBy(
          codePackages
            .map(({ type, softwareDevelopmentKits = [] }) =>
              softwareDevelopmentKits.map(({ name }) => ({
                name,
                codePackageType: type,
              })),
            )
            .flat(),
          ({ name, codePackageType }) => `${name}${LOOKUP_SPLIT_KEY}${codePackageType}`,
        ),
        { logger, concurrency },
      ),
      syncRepositories(
        client,
        uniqBy(codePackages, 'repositoryName').map(
          ({ repositoryName }) =>
            ({
              name: repositoryName,
              url: `https://github.com/${repositoryName}`,
            }) as RepositoryInput,
        ),
        { logger },
      ),
    ]);

  const softwareDevelopmentKitLookup = keyBy(
    existingSoftwareDevelopmentKits,
    ({ name, codePackageType }) => `${name}${LOOKUP_SPLIT_KEY}${codePackageType}`,
  );
  const codePackagesLookup = keyBy(
    existingCodePackages,
    ({ name, type }) => `${name}${LOOKUP_SPLIT_KEY}${type}`,
  );

  const mapCodePackagesToExisting = codePackages.map((codePackageInput) => [
    codePackageInput,
    codePackagesLookup[`${codePackageInput.name}${LOOKUP_SPLIT_KEY}${codePackageInput.type}`]?.id,
  ]);

  // Create new code packages
  const newCodePackages = mapCodePackagesToExisting
    .filter(([, existing]) => !existing)
    .map(([codePackageInput]) => codePackageInput as CodePackageInput);
  try {
    logger.info(`Creating "${newCodePackages.length}" new code packages...`);
    await map(
      newCodePackages,
      async ({ softwareDevelopmentKits, ...codePackage }) => {
        await createCodePackage(client, {
          input: {
            ...codePackage,
            ...(softwareDevelopmentKits
              ? {
                  softwareDevelopmentKitIds: uniq(
                    softwareDevelopmentKits.map(({ name }) => {
                      const sdk =
                        softwareDevelopmentKitLookup[
                          `${name}${LOOKUP_SPLIT_KEY}${codePackage.type}`
                        ];
                      if (!sdk) {
                        throw new Error(`Failed to find SDK with name: "${name}"`);
                      }
                      return sdk.id;
                    }),
                  ),
                }
              : {}),
          },
          logger,
        });
      },
      { concurrency },
    );
    logger.info(`Successfully synced ${newCodePackages.length} code packages!`);
  } catch (err) {
    encounteredError = true;
    logger.error(`Failed to create code packages! - ${(err as Error).message}`);
  }

  // Update existing code packages
  const existingCodePackageInputs = mapCodePackagesToExisting.filter(
    (x): x is [CodePackageInput, string] => !!x[1],
  );
  logger.info(`Updating "${existingCodePackageInputs.length}" code packages...`);
  const chunks = chunk(existingCodePackageInputs, CHUNK_SIZE);

  await mapSeries(chunks, async (chk) => {
    try {
      await updateCodePackages(client, {
        input: chk.map(([{ softwareDevelopmentKits, repositoryName, ...input }, id]) => ({
          ...input,
          ...(softwareDevelopmentKits
            ? {
                softwareDevelopmentKitIds: uniq(
                  softwareDevelopmentKits.map(({ name }) => {
                    const sdk =
                      softwareDevelopmentKitLookup[`${name}${LOOKUP_SPLIT_KEY}${input.type}`];
                    if (!sdk) {
                      throw new Error(`Failed to find SDK with name: "${name}"`);
                    }
                    return sdk.id;
                  }),
                ),
              }
            : {}),
          id,
        })),
        logger,
      });
      logger.info(`Successfully updated "${chk.length}" code packages!`);
    } catch (err) {
      encounteredError = true;
      logger.error(`Failed to update code packages! - ${(err as Error).message}`);
    }
  });

  logger.info(`Synced "${codePackages.length}" code packages!`);
  return !encounteredError;
}
