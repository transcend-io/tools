import {
  graphqlMutateToolsEnabled,
  graphqlReadToolsEnabled,
  TRANSCEND_MCP_GRAPHQL_TOOLS_ENV,
} from '@transcend-io/mcp-server-base';
import { afterEach, describe, expect, it } from 'vitest';

import { buildUmbrellaServerInstructions } from '../src/server-instructions.js';

describe('buildUmbrellaServerInstructions', () => {
  const original = process.env[TRANSCEND_MCP_GRAPHQL_TOOLS_ENV];

  afterEach(() => {
    if (original === undefined) delete process.env[TRANSCEND_MCP_GRAPHQL_TOOLS_ENV];
    else process.env[TRANSCEND_MCP_GRAPHQL_TOOLS_ENV] = original;
  });

  it('includes full GraphQL fallback guidance when all tools are enabled', () => {
    delete process.env[TRANSCEND_MCP_GRAPHQL_TOOLS_ENV];
    expect(graphqlReadToolsEnabled()).toBe(true);
    expect(graphqlMutateToolsEnabled()).toBe(true);
    const text = buildUmbrellaServerInstructions();
    expect(text).toContain('graphql_inspect_schema');
    expect(text).toContain('graphql_query');
    expect(text).toContain('graphql_mutate');
  });

  it('omits mutate when mode is read', () => {
    process.env[TRANSCEND_MCP_GRAPHQL_TOOLS_ENV] = 'read';
    const text = buildUmbrellaServerInstructions();
    expect(text).toContain('graphql_query');
    expect(text).not.toContain('graphql_mutate');
  });

  it('omits GraphQL fallback when disabled', () => {
    process.env[TRANSCEND_MCP_GRAPHQL_TOOLS_ENV] = 'off';
    const text = buildUmbrellaServerInstructions();
    expect(text).not.toContain('graphql_inspect_schema');
    expect(text).not.toContain('GraphQL API');
  });
});
