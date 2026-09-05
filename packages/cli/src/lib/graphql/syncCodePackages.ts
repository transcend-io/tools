import { CodePackageType } from '@transcend-io/privacy-types';
import {
  CREATE_CODE_PACKAGE,
  UPDATE_CODE_PACKAGES,
  fetchAllCodePackages,
  type CodePackage,
  makeGraphQLRequest,
  syncRepositories,
  syncSoftwareDevelopmentKits,
} from '@transcend-io/sdk';
import { map, mapSeries, type Logger } from '@transcend-io/utils';
import colors from 'colors';
import { GraphQLClient } from 'graphql-request';
import { chunk, uniq, keyBy, uniqBy } from 'lodash-es';

import { CodePackageInput, RepositoryInput } from '../../codecs.js';
import { logger } from '../../logger.js';

const CHUNK_SIZE = 100;

const LOOKUP_SPLIT_KEY = '%%%%';

/** Runtime dependencies for synchronizing code packages. */
export interface SyncCodePackagesDependencies {
  /** Logger used for progress and GraphQL request diagnostics. */
  readonly logger: Logger;
}

const defaultDependencies: SyncCodePackagesDependencies = {
  logger,
};

/**
 * Create a new code package
 *
 * @param client - GraphQL client
 * @param input - Code package input
 * @param dependencies - Runtime dependencies
 * @returns Code package ID
 */
export async function createCodePackage(
  client: GraphQLClient,
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
  },
  dependencies: SyncCodePackagesDependencies = defaultDependencies,
): Promise<CodePackage> {
  const { logger: activeLogger } = dependencies;
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
    logger: activeLogger,
  });
  activeLogger.info(colors.green(`Successfully created code package "${input.name}"!`));
  return codePackage;
}

/**
 * Update an existing code package
 *
 * @param client - GraphQL client
 * @param inputs - Code package input
 * @param dependencies - Runtime dependencies
 * @returns Code packages that were updated
 */
export async function updateCodePackages(
  client: GraphQLClient,
  inputs: {
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
  }[],
  dependencies: SyncCodePackagesDependencies = defaultDependencies,
): Promise<CodePackage[]> {
  const { logger: activeLogger } = dependencies;
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
    logger: activeLogger,
  });
  activeLogger.info(colors.green(`Successfully updated ${inputs.length} code packages!`));
  return codePackages;
}

/**
 * Uploads silo discovery results for Transcend to classify
 *
 * @param client - GraphQL Client
 * @param codePackages - Packages to upload
 * @param concurrency - How many concurrent requests to make
 * @param dependencies - Runtime dependencies
 * @returns True if successful, false if any updates failed, or an error occurs
 */
export async function syncCodePackages(
  client: GraphQLClient,
  codePackages: CodePackageInput[],
  concurrency = 20,
  dependencies: SyncCodePackagesDependencies = defaultDependencies,
): Promise<boolean> {
  const { logger: activeLogger } = dependencies;
  let encounteredError = false;
  const [existingCodePackages, { softwareDevelopmentKits: existingSoftwareDevelopmentKits }] =
    await Promise.all([
      // fetch all code packages
      fetchAllCodePackages(client, { logger: activeLogger }),
      // make sure all SDKs exist
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
        { logger: activeLogger, concurrency },
      ),
      // make sure all Repositories exist
      syncRepositories(
        client,
        uniqBy(codePackages, 'repositoryName').map(
          ({ repositoryName }) =>
            ({
              name: repositoryName,
              url: `https://github.com/${repositoryName}`,
            }) as RepositoryInput,
        ),
        { logger: activeLogger },
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

  // Determine which codePackages are new vs existing
  const mapCodePackagesToExisting = codePackages.map((codePackageInput) => [
    codePackageInput,
    codePackagesLookup[`${codePackageInput.name}${LOOKUP_SPLIT_KEY}${codePackageInput.type}`]?.id,
  ]);

  // Create the new codePackages
  const newCodePackages = mapCodePackagesToExisting
    .filter(([, existing]) => !existing)
    .map(([codePackageInput]) => codePackageInput as CodePackageInput);
  try {
    activeLogger.info(colors.magenta(`Creating "${newCodePackages.length}" new code packages...`));
    await map(
      newCodePackages,
      async ({ softwareDevelopmentKits, ...codePackage }) => {
        await createCodePackage(
          client,
          {
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
          dependencies,
        );
      },
      {
        concurrency,
      },
    );
    activeLogger.info(colors.green(`Successfully synced ${newCodePackages.length} code packages!`));
  } catch (err) {
    encounteredError = true;
    activeLogger.error(colors.red(`Failed to create code packages! - ${err.message}`));
  }

  // Update existing codePackages
  const existingCodePackageInputs = mapCodePackagesToExisting.filter(
    (x): x is [CodePackageInput, string] => !!x[1],
  );
  activeLogger.info(
    colors.magenta(`Updating "${existingCodePackageInputs.length}" code packages...`),
  );
  const chunks = chunk(existingCodePackageInputs, CHUNK_SIZE);

  await mapSeries(chunks, async (chunk) => {
    try {
      await updateCodePackages(
        client,
        chunk.map(
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          ([{ softwareDevelopmentKits, repositoryName, ...input }, id]) => ({
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
          }),
        ),
        dependencies,
      );
      activeLogger.info(colors.green(`Successfully updated "${chunk.length}" code packages!`));
    } catch (err) {
      encounteredError = true;
      activeLogger.error(colors.red(`Failed to update code packages! - ${err.message}`));
    }
  });

  activeLogger.info(colors.green(`Synced "${codePackages.length}" code packages!`));
  return !encounteredError;
}
