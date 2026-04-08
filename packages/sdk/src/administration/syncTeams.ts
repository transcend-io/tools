import { ScopeName } from '@transcend-io/privacy-types';
import { mapSeries, type Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';
import { keyBy } from 'lodash-es';

import { makeGraphQLRequest, NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
import { fetchAllTeams, Team } from './fetchAllTeams.js';
import { UPDATE_TEAM, CREATE_TEAM } from './gqls/team.js';

export interface TeamInput {
  /** The display name of the team */
  name: string;
  /** Team description */
  description: string;
  /** SSO department for automated provisioning */
  'sso-department'?: string;
  /** SSO group name for automated provisioning */
  'sso-group'?: string;
  /** SSO title mapping for automated provisioning */
  'sso-title'?: string;
  /** List of user emails on the team */
  users?: string[];
  /** List of scopes that the team should have */
  scopes?: ScopeName[];
}

/**
 * Input to create a new team
 *
 * @param client - GraphQL client
 * @param team - Input
 * @param options - Options
 * @returns Created team
 */
export async function createTeam(
  client: GraphQLClient,
  team: TeamInput,
  options: {
    /** Logger instance */
    logger?: Logger;
  },
): Promise<Pick<Team, 'id' | 'name'>> {
  const { logger = NOOP_LOGGER } = options;
  const input = {
    name: team.name,
    description: team.description,
    ssoTitle: team['sso-title'],
    ssoDepartment: team['sso-department'],
    ssoGroup: team['sso-group'],
    scopes: team.scopes,
    userEmails: team.users,
  };

  const { createTeam } = await makeGraphQLRequest<{
    /** Create team mutation */
    createTeam: {
      /** Created team */
      team: Team;
    };
  }>(client, CREATE_TEAM, {
    variables: { input },
    logger,
  });
  return createTeam.team;
}

/**
 * Input to update teams
 *
 * @param client - GraphQL client
 * @param input - Team input to update
 * @param teamId - ID of team
 * @param options - Options
 * @returns Updated team
 */
export async function updateTeam(
  client: GraphQLClient,
  input: TeamInput & {
    /** ID of team to update */
    id: string;
  },
  options: {
    /** Logger instance */
    logger?: Logger;
  },
): Promise<Pick<Team, 'id' | 'name'>> {
  const { logger = NOOP_LOGGER } = options;
  const teamId = input.id;
  const { updateTeam } = await makeGraphQLRequest<{
    /** Update team mutation */
    updateTeam: {
      /** Updated team */
      team: Team;
    };
  }>(client, UPDATE_TEAM, {
    variables: {
      input: {
        id: teamId,
        name: input.name,
        description: input.description,
        ssoTitle: input['sso-title'],
        ssoDepartment: input['sso-department'],
        ssoGroup: input['sso-group'],
        scopes: input.scopes,
        userEmails: input.users,
      },
    },
    logger,
  });
  return updateTeam.team;
}

/**
 * Sync the teams
 *
 * @param client - GraphQL client
 * @param inputs - Inputs to create
 * @param options - Options
 * @returns True if run without error, returns false if an error occurred
 */
export async function syncTeams(
  client: GraphQLClient,
  inputs: TeamInput[],
  options: {
    /** Logger instance */
    logger?: Logger;
  },
): Promise<boolean> {
  const { logger = NOOP_LOGGER } = options;
  // Fetch existing
  logger.info(`Syncing "${inputs.length}" teams...`);

  let encounteredError = false;

  // Fetch existing
  const existingTeams = await fetchAllTeams(client, { logger });

  // Look up by name
  const teamsByName: { [k in string]: Pick<Team, 'id' | 'name'> } = keyBy(existingTeams, 'name');

  // Create new teams
  const newTeams = inputs.filter((input) => !teamsByName[input.name]);
  const updatedTeams = inputs.filter((input) => !!teamsByName[input.name]);

  // Create new teams
  await mapSeries(newTeams, async (team) => {
    try {
      const newTeam = await createTeam(client, team, { logger });
      teamsByName[newTeam.name] = newTeam;
      logger.info(`Successfully created team "${team.name}"!`);
    } catch (err) {
      encounteredError = true;
      logger.error(`Failed to sync team "${team.name}"! - ${(err as Error).message}`);
    }
  });

  // Update all teams
  await mapSeries(updatedTeams, async (input) => {
    try {
      const newTeam = await updateTeam(
        client,
        { ...input, id: teamsByName[input.name]!.id },
        { logger },
      );
      teamsByName[newTeam.name] = newTeam;
      logger.info(`Successfully updated team "${input.name}"!`);
    } catch (err) {
      encounteredError = true;
      logger.error(`Failed to sync team "${input.name}"! - ${(err as Error).message}`);
    }
  });

  return !encounteredError;
}
