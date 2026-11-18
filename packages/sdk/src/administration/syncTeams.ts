import { ScopeName } from '@transcend-io/privacy-types';
import { mapSeries, type Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';
import { keyBy } from 'lodash-es';

import { makeGraphQLRequest, NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
import { fetchAllTeams, type Team } from './fetchAllTeams.js';
import { resolveParentTeamIdsByName } from './fetchParentOrganizationTeams.js';
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
  /** Parent organization team name to link this team to */
  'parent-team-name'?: string;
  /** List of user emails on the team */
  users?: string[];
  /** List of scopes that the team should have */
  scopes?: ScopeName[];
}

/**
 * Map team input to GraphQL mutation input
 *
 * @param team - Team input
 * @param parentTeamIdsByName - Resolved parent organization team IDs
 * @returns GraphQL team mutation input
 */
function toTeamMutationInput(
  team: TeamInput,
  parentTeamIdsByName: { [name in string]: string },
): {
  /** The display name of the team */
  name: string;
  /** Team description */
  description: string;
  /** SSO title mapping for automated provisioning */
  ssoTitle?: string;
  /** SSO department for automated provisioning */
  ssoDepartment?: string;
  /** SSO group name for automated provisioning */
  ssoGroup?: string;
  /** List of scopes that the team should have */
  scopes?: ScopeName[];
  /** List of user emails on the team */
  userEmails?: string[];
  /** Parent organization team ID to link this team to */
  parentTeam?: string;
} {
  const parentTeamName = team['parent-team-name'];
  const parentTeam = parentTeamName ? parentTeamIdsByName[parentTeamName] : undefined;

  return {
    name: team.name,
    description: team.description,
    ssoTitle: team['sso-title'],
    ssoDepartment: team['sso-department'],
    ssoGroup: team['sso-group'],
    scopes: team.scopes,
    userEmails: team.users,
    ...(parentTeam ? { parentTeam } : {}),
  };
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
  options: {
    /** Team to create */
    input: TeamInput;
    /** Resolved parent organization team IDs */
    parentTeamIdsByName?: { [name in string]: string };
    /** Logger instance */
    logger?: Logger;
  },
): Promise<Pick<Team, 'id' | 'name'>> {
  const { input: team, parentTeamIdsByName = {}, logger = NOOP_LOGGER } = options;
  const input = toTeamMutationInput(team, parentTeamIdsByName);

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
 * @param options - Options
 * @returns Updated team
 */
export async function updateTeam(
  client: GraphQLClient,
  options: {
    /** Team input to update */
    input: TeamInput & {
      /** ID of team to update */
      id: string;
    };
    /** Resolved parent organization team IDs */
    parentTeamIdsByName?: { [name in string]: string };
    /** Logger instance */
    logger?: Logger;
  },
): Promise<Pick<Team, 'id' | 'name'>> {
  const { input: team, parentTeamIdsByName = {}, logger = NOOP_LOGGER } = options;
  const teamId = team.id;
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
        ...toTeamMutationInput(team, parentTeamIdsByName),
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
  } = {},
): Promise<boolean> {
  const { logger = NOOP_LOGGER } = options;
  // Fetch existing
  logger.info(`Syncing "${inputs.length}" teams...`);

  let encounteredError = false;

  const parentTeamNames = inputs
    .map((input) => input['parent-team-name'])
    .filter((name): name is string => !!name);
  let parentTeamIdsByName: { [name in string]: string } = {};
  if (parentTeamNames.length > 0) {
    try {
      parentTeamIdsByName = await resolveParentTeamIdsByName(client, parentTeamNames, { logger });
    } catch (err) {
      logger.error(`Failed to resolve parent organization teams - ${(err as Error).message}`);
      return false;
    }
  }

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
      const newTeam = await createTeam(client, { input: team, parentTeamIdsByName, logger });
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
      const newTeam = await updateTeam(client, {
        input: { ...input, id: teamsByName[input.name]!.id },
        parentTeamIdsByName,
        logger,
      });
      teamsByName[newTeam.name] = newTeam;
      logger.info(`Successfully updated team "${input.name}"!`);
    } catch (err) {
      encounteredError = true;
      logger.error(`Failed to sync team "${input.name}"! - ${(err as Error).message}`);
    }
  });

  return !encounteredError;
}
