import { afterEach, describe, expect, it } from 'vitest';

import {
  graphqlMutateToolsEnabled,
  graphqlReadToolsEnabled,
  graphqlToolsMode,
  TRANSCEND_MCP_GRAPHQL_TOOLS_ENV,
} from '../src/oauth/env.js';

describe('graphqlToolsMode', () => {
  const original = process.env[TRANSCEND_MCP_GRAPHQL_TOOLS_ENV];

  afterEach(() => {
    if (original === undefined) delete process.env[TRANSCEND_MCP_GRAPHQL_TOOLS_ENV];
    else process.env[TRANSCEND_MCP_GRAPHQL_TOOLS_ENV] = original;
  });

  it('defaults to all when unset', () => {
    delete process.env[TRANSCEND_MCP_GRAPHQL_TOOLS_ENV];
    expect(graphqlToolsMode()).toBe('all');
    expect(graphqlReadToolsEnabled()).toBe(true);
    expect(graphqlMutateToolsEnabled()).toBe(true);
  });

  it('treats on/1/true as all', () => {
    for (const value of ['all', 'on', '1', 'true']) {
      process.env[TRANSCEND_MCP_GRAPHQL_TOOLS_ENV] = value;
      expect(graphqlToolsMode()).toBe('all');
    }
  });

  it('enables read-only tools for read', () => {
    process.env[TRANSCEND_MCP_GRAPHQL_TOOLS_ENV] = 'read';
    expect(graphqlToolsMode()).toBe('read');
    expect(graphqlReadToolsEnabled()).toBe(true);
    expect(graphqlMutateToolsEnabled()).toBe(false);
  });

  it('disables tools for off', () => {
    process.env[TRANSCEND_MCP_GRAPHQL_TOOLS_ENV] = 'off';
    expect(graphqlToolsMode()).toBe('off');
    expect(graphqlReadToolsEnabled()).toBe(false);
    expect(graphqlMutateToolsEnabled()).toBe(false);
  });

  it('fails closed on unknown values', () => {
    process.env[TRANSCEND_MCP_GRAPHQL_TOOLS_ENV] = 'bogus';
    expect(graphqlToolsMode()).toBe('off');
    expect(graphqlReadToolsEnabled()).toBe(false);
  });
});
