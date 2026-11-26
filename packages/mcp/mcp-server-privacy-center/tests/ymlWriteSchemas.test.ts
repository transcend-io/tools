import { toolInputSchema, type ToolClients } from '@transcend-io/mcp-server-base';
import { describe, expect, it } from 'vitest';

import { getPrivacyCenterTools } from '../src/tools/index.js';

const clients = {
  rest: {} as never,
  graphql: {} as never,
  dashboardUrl: 'https://app.transcend.io',
} satisfies ToolClients;

/** Tool name, argument name, and one field the transcend.yml codec defines for each item. */
const CASES = [
  ['privacy_center_write_policies', 'policies', 'title'],
  ['privacy_center_write_intl_messages', 'messages', 'id'],
] as const;

describe('mcp-server-privacy-center write tool input schemas', () => {
  it.each(CASES)('%s advertises the codec fields of %s', (name, arg, field) => {
    const tool = getTools().find((candidate) => candidate.name === name)!;
    const schema = toolInputSchema(tool.zodSchema) as {
      properties: Record<string, { items?: { properties?: Record<string, unknown> } }>;
    };

    expect(schema.properties[arg]?.items?.properties).toHaveProperty(field);
  });
});

function getTools() {
  return getPrivacyCenterTools(clients);
}
