import {
  toolInputSchema,
  TranscendRestClient,
  type AuthCredentials,
} from '@transcend-io/mcp-server-base';
import { describe, expect, it } from 'vitest';

import { TranscendGraphQLClient } from '../src/graphql-client.js';
import { ToolRegistry } from '../src/registry.js';

const TEST_AUTH: AuthCredentials = { type: 'apiKey', apiKey: 'test-key' };

/** Ceiling for one tool's top-level description in tools/list. */
const MAX_TOOL_DESCRIPTION_CHARS = 700;

/**
 * Ceiling for the full stdio-shaped tools/list JSON (name, description,
 * inputSchema, annotations). Character length of JSON.stringify.
 * Measured at 80,346 across 82 tools after dropping the per-schema `$schema`
 * pointer and expanding `assessments_list`. Prefer consolidating or trimming
 * descriptors over raising this cap.
 */
const MAX_TOOLS_LIST_JSON_CHARS = 85_000;

function listDescriptors(registry: ToolRegistry) {
  return registry.getAllTools().map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: toolInputSchema(tool.zodSchema),
    annotations: tool.annotations,
  }));
}

describe('umbrella tools/list size', () => {
  it('keeps each description and the full list under the context budgets', () => {
    const rest = new TranscendRestClient(TEST_AUTH, 'http://localhost:0');
    const graphql = new TranscendGraphQLClient(TEST_AUTH, 'http://localhost:0');
    const registry = new ToolRegistry({
      rest,
      graphql,
      dashboardUrl: 'https://app.transcend.io',
    });

    const oversized = registry
      .getAllTools()
      .filter((tool) => tool.description.length > MAX_TOOL_DESCRIPTION_CHARS)
      .map((tool) => `${tool.name} (${tool.description.length} chars)`);
    expect(
      oversized,
      `tool descriptions over ${MAX_TOOL_DESCRIPTION_CHARS} chars: ${oversized.join(', ')}`,
    ).toEqual([]);

    const json = JSON.stringify({ tools: listDescriptors(registry) });
    expect(
      json.length,
      `tools/list JSON is ${json.length} chars; cap is ${MAX_TOOLS_LIST_JSON_CHARS}. ` +
        'Do not inline catalogs into always-loaded tool descriptions.',
    ).toBeLessThanOrEqual(MAX_TOOLS_LIST_JSON_CHARS);
  });
});
