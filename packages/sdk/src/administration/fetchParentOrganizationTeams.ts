import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { PARENT_ORGANIZATION_TEAMS } from './gqls/team.js';

export interface ParentOrganizationTeam {
  /** ID of parent organization team */
  id: string;
  /** Display name of parent organization team */
  name: string;
}

const PAGE_SIZE = 20;

/**
 * Fetch teams from the parent organization that can be linked to child-org teams
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns Parent organization teams
 */
export async function fetchParentOrganizationTeams(
  client: GraphQLClient,
  options: {
    /** Logger instance */
    logger?: Logger;
    /** Filter options */
    filterBy?: {
      /** Partial match on team name or description */
      text?: string;
      /** Filter by team IDs */
      ids?: string[];
    };
  } = {},
): Promise<ParentOrganizationTeam[]> {
  const { logger, filterBy } = options;
  const teams: ParentOrganizationTeam[] = [];
  let offset = 0;

  let shouldContinue = false;
  do {
    const {
      parentOrganizationTeams: { nodes },
    } = await makeGraphQLRequest<{
      /** Parent organization teams */
      parentOrganizationTeams: {
        /** List */
        nodes: ParentOrganizationTeam[];
      };
    }>(client, PARENT_ORGANIZATION_TEAMS, {
      variables: { first: PAGE_SIZE, offset, filterBy },
      logger,
    });
    teams.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return teams.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Resolve parent organization team names to IDs
 *
 * @param client - GraphQL client
 * @param parentTeamNames - Parent organization team names to resolve
 * @param options - Options
 * @returns Map from parent team name to ID
 */
export async function resolveParentTeamIdsByName(
  client: GraphQLClient,
  parentTeamNames: string[],
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<{ [name in string]: string }> {
  const { logger } = options;
  const uniqueNames = [...new Set(parentTeamNames)];
  const parentTeamIdsByName: { [name in string]: string } = {};

  for (const name of uniqueNames) {
    const teams = await fetchParentOrganizationTeams(client, {
      logger,
      filterBy: { text: name },
    });
    const match = teams.find((team) => team.name === name);
    if (!match) {
      throw new Error(`Failed to find parent organization team with name: ${name}`);
    }
    parentTeamIdsByName[name] = match.id;
  }

  return parentTeamIdsByName;
}
