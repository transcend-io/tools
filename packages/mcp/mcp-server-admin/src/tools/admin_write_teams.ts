import { defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import {
  decodeYmlItems,
  pushYmlSection,
  ymlItemsSchema,
} from '@transcend-io/mcp-server-base/transcend-yml';
import { TeamInput } from '@transcend-io/sdk';

export const WriteTeamsSchema = z.object({
  teams: ymlItemsSchema(
    'Teams to create or update, matched by name. Each needs name and description. ' +
      'Optional: users (emails), scopes, parent-team-name, sso-department, sso-group, sso-title.',
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
      const decoded = decodeYmlItems<TeamInput>(TeamInput, teams, 'teams', {
        uniqueBy: (team) => team.name,
      });
      return pushYmlSection(clients, { teams: decoded }, decoded.length);
    },
  });
}
