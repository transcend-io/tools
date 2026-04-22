import { getAdminTools } from '@transcend-io/mcp-server-admin';
import { getAssessmentTools } from '@transcend-io/mcp-server-assessments';
import { getConsentTools } from '@transcend-io/mcp-server-consent';
import {
  TranscendRestClient,
  type AuthCredentials,
  type ToolClients,
} from '@transcend-io/mcp-server-core';
import { getDiscoveryTools } from '@transcend-io/mcp-server-discovery';
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
};

const allTools = [
  ...getDSRTools(mockClients),
  ...getConsentTools(mockClients),
  ...getPreferenceTools(mockClients),
  ...getInventoryTools(mockClients),
  ...getDiscoveryTools(mockClients),
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

  it('ToolRegistry registers all tools with correct count', () => {
    const rest = new TranscendRestClient(TEST_AUTH, 'http://localhost:0');
    const graphql = new TranscendGraphQLClient(TEST_AUTH, 'http://localhost:0');
    const registry = new ToolRegistry({ rest, graphql });

    expect(registry.getToolCount()).toBe(EXPECTED_UMBRELLA_TOOL_COUNT);
    expect(registry.getToolList()).toHaveLength(EXPECTED_UMBRELLA_TOOL_COUNT);
  });

  it('getToolList returns well-formed tool descriptors', () => {
    const rest = new TranscendRestClient(TEST_AUTH, 'http://localhost:0');
    const graphql = new TranscendGraphQLClient(TEST_AUTH, 'http://localhost:0');
    const registry = new ToolRegistry({ rest, graphql });

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
    const registry = new ToolRegistry({ rest, graphql });

    expect(registry.getTool('nonexistent_tool')).toBeUndefined();
  });

  it('executeTool throws for unknown tools', async () => {
    const rest = new TranscendRestClient(TEST_AUTH, 'http://localhost:0');
    const graphql = new TranscendGraphQLClient(TEST_AUTH, 'http://localhost:0');
    const registry = new ToolRegistry({ rest, graphql });

    await expect(registry.executeTool('nonexistent_tool', {})).rejects.toThrow('Unknown tool');
  });
});
