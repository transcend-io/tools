import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { REPOSITORIES } from './gqls/repository.js';

export interface Repository {
  /** ID of repository */
  id: string;
  /** Name of repository */
  name: string;
  /** Description of repository */
  description: string;
  /** URL of repo */
  url: string;
  /** The teams that manage the repository */
  teams: {
    /** ID of team */
    id: string;
    /** Name of team */
    name: string;
  }[];
  /** The users that manage the repository */
  owners: {
    /** ID of user */
    id: string;
    /** Email of user */
    email: string;
  }[];
}

const PAGE_SIZE = 20;

/**
 * Fetch all repositories in the organization
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns All repositories in the organization
 */
export async function fetchAllRepositories(
  client: GraphQLClient,
  options: {
    /** Logger instance */
    logger: Logger;
  },
): Promise<Repository[]> {
  const { logger } = options;
  const repositories: Repository[] = [];
  let offset = 0;

  // Whether to continue looping
  let shouldContinue = false;
  do {
    const {
      repositories: { nodes },
    } = await makeGraphQLRequest<{
      /** Repositories */
      repositories: {
        /** List */
        nodes: Repository[];
      };
    }>(client, REPOSITORIES, {
      variables: { first: PAGE_SIZE, offset },
      logger,
    });
    repositories.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return repositories.sort((a, b) => a.name.localeCompare(b.name));
}
