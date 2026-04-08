import { mapSeries, map, type Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';
import { chunk, keyBy } from 'lodash-es';

import { makeGraphQLRequest, NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
import { fetchAllRepositories, Repository } from './fetchAllRepositories.js';
import { UPDATE_REPOSITORIES, CREATE_REPOSITORY } from './gqls/repository.js';

export interface RepositoryInput {
  /** Title of repository */
  name: string;
  /** Description of the repository */
  description?: string;
  /** Github repository URL */
  url: string;
}

const CHUNK_SIZE = 100;

/**
 * Create a new repository
 *
 * @param client - GraphQL client
 * @param input - Repository input
 * @param options - Options
 * @returns Created repository
 */
export async function createRepository(
  client: GraphQLClient,
  options: {
    /** Repository to create */
    input: {
      /** Title of repository */
      name: string;
      /** Description of the repository */
      description?: string;
      /** Github repository */
      url: string;
      /** User IDs of owners */
      ownerIds?: string[];
      /** Emails of owners */
      ownerEmails?: string[];
      /** Team IDs */
      teamIds?: string[];
      /** Team names */
      teamNames?: string[];
    };
    /** Logger instance */
    logger?: Logger;
  },
): Promise<Repository> {
  const { input, logger = NOOP_LOGGER } = options;
  const {
    createRepository: { repository },
  } = await makeGraphQLRequest<{
    /** createRepository mutation */
    createRepository: {
      /** Software development kit */
      repository: Repository;
    };
  }>(client, CREATE_REPOSITORY, {
    variables: { input },
    logger,
  });
  logger.info(`Successfully created repository "${input.name}"!`);
  return repository;
}

/**
 * Update an existing repository
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns Updated repositories
 */
export async function updateRepositories(
  client: GraphQLClient,
  options: {
    /** Repository inputs to update */
    input: {
      /** ID of repository */
      id: string;
      /** Title of repository */
      name?: string;
      /** Description of the repository */
      description?: string;
      /** Github repository */
      url?: string;
      /** User IDs of owners */
      ownerIds?: string[];
      /** Emails of owners */
      ownerEmails?: string[];
      /** Team IDs */
      teamIds?: string[];
      /** Team names */
      teamNames?: string[];
    }[];
    /** Logger instance */
    logger?: Logger;
  },
): Promise<Repository[]> {
  const { input: repositories, logger = NOOP_LOGGER } = options;
  const {
    updateRepositories: { repositories: updatedRepositories },
  } = await makeGraphQLRequest<{
    /** updateRepositories mutation */
    updateRepositories: {
      /** Software development kit */
      repositories: Repository[];
    };
  }>(client, UPDATE_REPOSITORIES, {
    variables: {
      input: {
        repositories,
      },
    },
    logger,
  });
  logger.info(`Successfully updated ${repositories.length} repositories!`);
  return updatedRepositories;
}

/**
 * Sync the repositories
 *
 * @param client - GraphQL client
 * @param repositories - Repositories
 * @param options - Options
 * @returns The repositories that were upserted and whether the sync was successful
 */
export async function syncRepositories(
  client: GraphQLClient,
  repositories: RepositoryInput[],
  options: {
    /** Logger instance */
    logger?: Logger;
    /** Concurrency */
    concurrency?: number;
  } = {},
): Promise<{
  /** The repositories that were upserted */
  repositories: Repository[];
  /** If successful */
  success: boolean;
}> {
  const { logger = NOOP_LOGGER, concurrency = 20 } = options;
  let encounteredError = false;
  const repos: Repository[] = [];

  // Index existing repositories
  const existing = await fetchAllRepositories(client, { logger });
  const repositoryByName = keyBy(existing, 'name');

  // Determine which repositories are new vs existing
  const mapRepositoriesToExisting = repositories.map((repoInput) => [
    repoInput,
    repositoryByName[repoInput.name]?.id,
  ]);

  // Create the new repositories
  const newRepositories = mapRepositoriesToExisting
    .filter(([, existing]) => !existing)
    .map(([repoInput]) => repoInput as RepositoryInput);
  try {
    logger.info(`Creating "${newRepositories.length}" new repositories...`);
    await map(
      newRepositories,
      async (repo) => {
        const newRepo = await createRepository(client, { input: repo, logger });
        repos.push(newRepo);
      },
      {
        concurrency,
      },
    );
    logger.info(`Successfully synced ${newRepositories.length} repositories!`);
  } catch (err) {
    encounteredError = true;
    logger.error(`Failed to create repositories! - ${(err as Error).message}`);
  }

  // Update existing repositories
  const existingRepositories = mapRepositoriesToExisting.filter(
    (x): x is [RepositoryInput, string] => !!x[1],
  );
  const chunks = chunk(existingRepositories, CHUNK_SIZE);
  logger.info(`Updating "${existingRepositories.length}" repositories...`);

  await mapSeries(chunks, async (chunk) => {
    try {
      const updatedRepos = await updateRepositories(client, {
        input: chunk.map(([input, id]) => ({
          ...input,
          id,
        })),
        logger,
      });
      repos.push(...updatedRepos);
      logger.info(`Successfully updated "${existingRepositories.length}" repositories!`);
    } catch (err) {
      encounteredError = true;
      logger.error(`Failed to update repositories! - ${(err as Error).message}`);
    }

    logger.info(`Synced "${repositories.length}" repositories!`);
  });

  // Return true upon success
  return {
    repositories: repos,
    success: !encounteredError,
  };
}
