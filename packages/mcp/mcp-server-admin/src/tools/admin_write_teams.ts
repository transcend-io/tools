import {
  createGraphqlRequestClient,
  defineTool,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import { createCollectedLogger } from '@transcend-io/mcp-server-config';
import { syncTeams, TeamInput } from '@transcend-io/sdk';

import { decodeItems, runSync } from '../helpers/syncWrite.js';

export const WriteTeamsSchema = z.object({
  teams: z
    .array(z.record(z.string(), z.unknown()))
    .min(1)
    .max(100)
    .describe(
      'Teams to create or update, matched by name. Each needs name and description. ' +
        'Optional: users (emails), scopes, parent-team-name, sso-department, sso-group, sso-title. ' +
        'Same shape as the teams section of transcend.yml; see config_get_schema.',
    ),
});
export type WriteTeamsInput = z.infer<typeof WriteTeamsSchema>;

export function createAdminWriteTeamsTool(clients: ToolClients) {
  return defineTool({
    name: 'admin_write_teams',
    description:
      'Create or update teams by name, including their users and scopes. Same as the teams ' +
      'section of `transcend inventory push`. A listed team has its users and scopes set to ' +
      'the values given. Returns success, a count, and errors.',
    category: 'Admin',
    readOnly: false,
    confirmation: {
      hint:
        'Creates or updates teams, including the users on each team and the scopes the team ' +
        'grants. This changes who can access what in the organization. Check the team names, ' +
        'users and scopes before agreeing.',
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    zodSchema: WriteTeamsSchema,
    handler: async ({ teams }) => {
      const inputs = decodeItems<TeamInput>(TeamInput, teams, 'teams');
      const { logger, logs } = createCollectedLogger();
      return runSync(
        () => syncTeams(createGraphqlRequestClient(clients.graphql), inputs, { logger }),
        logs,
        inputs.length,
      );
    },
  });
}
