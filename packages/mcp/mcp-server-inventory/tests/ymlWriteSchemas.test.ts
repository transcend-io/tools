import { toolInputSchema, type ToolClients } from '@transcend-io/mcp-server-base';
import { describe, expect, it } from 'vitest';

import { getInventoryTools } from '../src/tools/index.js';

const clients = {
  rest: {} as never,
  graphql: {} as never,
  dashboardUrl: 'https://app.transcend.io',
} satisfies ToolClients;

/** Tool name, argument name, and one field the transcend.yml codec defines for each item. */
const CASES = [
  ['inventory_write_data_subjects', 'dataSubjects', 'type'],
  ['inventory_write_business_entities', 'businessEntities', 'title'],
  ['inventory_write_processing_activities', 'processingActivities', 'title'],
  ['inventory_write_custom_fields', 'attributes', 'name'],
  ['inventory_write_identifiers', 'identifiers', 'name'],
] as const;

describe('mcp-server-inventory write tool input schemas', () => {
  it.each(CASES)('%s advertises the codec fields of %s', (name, arg, field) => {
    const tool = getTools().find((candidate) => candidate.name === name)!;
    const schema = toolInputSchema(tool.zodSchema) as {
      properties: Record<string, { items?: { properties?: Record<string, unknown> } }>;
    };

    expect(schema.properties[arg]?.items?.properties).toHaveProperty(field);
  });
});

function getTools() {
  return getInventoryTools(clients);
}
