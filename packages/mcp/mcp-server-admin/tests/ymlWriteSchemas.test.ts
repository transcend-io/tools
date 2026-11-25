import { toolInputSchema, type ToolClients } from '@transcend-io/mcp-server-base';
import { describe, expect, it } from 'vitest';

import { getAdminTools } from '../src/tools/index.js';

const clients = {
  rest: {} as never,
  graphql: {} as never,
  dashboardUrl: 'https://app.transcend.io',
} satisfies ToolClients;

/** Tool name, argument name, and one field the transcend.yml codec defines for each item. */
const CASES = [
  ['admin_write_teams', 'teams', 'name'],
  ['admin_write_action_items', 'actionItems', 'title'],
  ['admin_write_action_item_collections', 'actionItemCollections', 'title'],
] as const;

describe('mcp-server-admin write tool input schemas', () => {
  it.each(CASES)('%s advertises the codec fields of %s', (name, arg, field) => {
    const tool = getTools().find((candidate) => candidate.name === name)!;
    const schema = toolInputSchema(tool.zodSchema) as {
      properties: Record<string, { items?: { properties?: Record<string, unknown> } }>;
    };

    expect(schema.properties[arg]?.items?.properties).toHaveProperty(field);
  });
});

function getTools() {
  return getAdminTools(clients);
}
