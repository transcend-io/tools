import { getAdminTools } from '@transcend-io/mcp-server-admin';
import { getAssessmentTools } from '@transcend-io/mcp-server-assessment';
import {
  isVisibleToModel,
  TranscendRestClient,
  type AuthCredentials,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import { getConsentTools } from '@transcend-io/mcp-server-consent';
import { getDiscoveryTools } from '@transcend-io/mcp-server-discovery';
import { getDocsTools } from '@transcend-io/mcp-server-docs';
import { getDSRTools } from '@transcend-io/mcp-server-dsr';
import { getInventoryTools } from '@transcend-io/mcp-server-inventory';
import { getPreferenceTools } from '@transcend-io/mcp-server-preferences';
import { getWorkflowTools } from '@transcend-io/mcp-server-workflows';
import { describe, it, expect, vi } from 'vitest';

import { TranscendGraphQLClient } from '../src/graphql-client.js';
import { ToolRegistry } from '../src/registry.js';
import { EXPECTED_UMBRELLA_TOOL_COUNT } from './umbrella-tool-count.js';

const TEST_AUTH: AuthCredentials = { type: 'apiKey', apiKey: 'test-key' };

const stubFn = () => vi.fn();

const mockClients: ToolClients = {
  rest: new Proxy({} as ToolClients['rest'], { get: stubFn }),
  graphql: new Proxy({} as ToolClients['graphql'], { get: stubFn }),
  dashboardUrl: 'https://app.transcend.io',
};

const allTools = [
  ...getDSRTools(mockClients),
  ...getConsentTools(mockClients),
  ...getPreferenceTools(mockClients),
  ...getInventoryTools(mockClients),
  ...getDiscoveryTools(mockClients),
  ...getDocsTools(mockClients),
  ...getAssessmentTools(mockClients),
  ...getWorkflowTools(mockClients),
  ...getAdminTools(mockClients),
];

describe('ToolRegistry', () => {
  it('has no duplicate tool names across domains', () => {
    const names = allTools.map((t) => t.name);
    const unique = new Set(names);
    const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
    expect(duplicates, `Duplicate tool names found: ${duplicates.join(', ')}`).toEqual([]);
    expect(unique.size).toBe(names.length);
  });

  // A `cursor` param is only honest where the underlying API threads it through to a real
  // endCursor. Everywhere else it was silently dropped, so callers paged forever on page one.
  it('only exposes cursor on the tools whose API actually pages by cursor', () => {
    const withCursor = allTools
      .filter((tool) => 'cursor' in (tool.zodSchema as { shape: Record<string, unknown> }).shape)
      .map((tool) => tool.name)
      .sort();

    expect(withCursor).toEqual(['dsr_list', 'preferences_query']);
  });

  it('ToolRegistry registers all tools with correct count', () => {
    const rest = new TranscendRestClient(TEST_AUTH, 'http://localhost:0');
    const graphql = new TranscendGraphQLClient(TEST_AUTH, 'http://localhost:0');
    const registry = new ToolRegistry({
      rest,
      graphql,
      dashboardUrl: 'https://app.transcend.io',
    });

    expect(registry.getToolCount()).toBe(EXPECTED_UMBRELLA_TOOL_COUNT);

    // Registering a tool and describing it to an embedder differ: gated tools and
    // tools with visibility omitting `model` stay callable but are withheld from the list.
    const hidden = registry.getAllTools().filter((tool) => !isVisibleToModel(tool)).length;
    const gated = registry.getAllTools().filter((tool) => tool.confirmation).length;
    expect(registry.getToolList()).toHaveLength(EXPECTED_UMBRELLA_TOOL_COUNT - gated - hidden);
  });

  it('getToolList returns well-formed tool descriptors', () => {
    const rest = new TranscendRestClient(TEST_AUTH, 'http://localhost:0');
    const graphql = new TranscendGraphQLClient(TEST_AUTH, 'http://localhost:0');
    const registry = new ToolRegistry({
      rest,
      graphql,
      dashboardUrl: 'https://app.transcend.io',
    });

    for (const tool of registry.getToolList()) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.annotations).toBeDefined();
    }
  });

  it('getTool returns undefined for unknown tools', () => {
    const rest = new TranscendRestClient(TEST_AUTH, 'http://localhost:0');
    const graphql = new TranscendGraphQLClient(TEST_AUTH, 'http://localhost:0');
    const registry = new ToolRegistry({
      rest,
      graphql,
      dashboardUrl: 'https://app.transcend.io',
    });

    expect(registry.getTool('nonexistent_tool')).toBeUndefined();
  });

  it('executeTool throws for unknown tools', async () => {
    const rest = new TranscendRestClient(TEST_AUTH, 'http://localhost:0');
    const graphql = new TranscendGraphQLClient(TEST_AUTH, 'http://localhost:0');
    const registry = new ToolRegistry({
      rest,
      graphql,
      dashboardUrl: 'https://app.transcend.io',
    });

    await expect(registry.executeTool('nonexistent_tool', {})).rejects.toThrow('Unknown tool');
  });
});
