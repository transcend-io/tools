import { mapSeries, map, type Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';
import { chunk, keyBy } from 'lodash-es';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
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
  },
  options: {
    /** Logger instance */
    logger: Logger;
  },
): Promise<Repository> {
  const { logger } = options;
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
 * @param inputs - Repository input
 * @param options - Options
 * @returns Updated repositories
 */
export async function updateRepositories(
  client: GraphQLClient,
  inputs: {
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
  }[],
  options: {
    /** Logger instance */
    logger: Logger;
  },
): Promise<Repository[]> {
  const { logger } = options;
  const {
    updateRepositories: { repositories },
  } = await makeGraphQLRequest<{
    /** updateRepositories mutation */
    updateRepositories: {
      /** Software development kit */
      repositories: Repository[];
    };
  }>(client, UPDATE_REPOSITORIES, {
    variables: {
      input: {
        repositories: inputs,
      },
    },
    logger,
  });
  logger.info(`Successfully updated ${inputs.length} repositories!`);
  return repositories;
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
    logger: Logger;
    /** Concurrency */
    concurrency?: number;
  },
): Promise<{
  /** The repositories that were upserted */
  repositories: Repository[];
  /** If successful */
  success: boolean;
}> {
  const { logger, concurrency = 20 } = options;
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
        const newRepo = await createRepository(client, repo, { logger });
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
      const updatedRepos = await updateRepositories(
        client,
        chunk.map(([input, id]) => ({
          ...input,
          id,
        })),
        { logger },
      );
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
