import { TranscendRestClient, type AuthCredentials } from '@transcend-io/mcp-server-base';
import { TranscendPullResource } from '@transcend-io/sdk';
import { describe, expect, it } from 'vitest';

import { TranscendGraphQLClient } from '../src/graphql-client.js';
import { ToolRegistry } from '../src/registry.js';
import { CLI_SECTION_TOOLS, READ_ONLY_BY_DESIGN } from './cli-parity-map.js';

const TEST_AUTH: AuthCredentials = { type: 'apiKey', apiKey: 'test-key' };

const registered = new Set(
  new ToolRegistry({
    rest: new TranscendRestClient(TEST_AUTH, 'http://localhost:0'),
    graphql: new TranscendGraphQLClient(TEST_AUTH, 'http://localhost:0'),
    dashboardUrl: 'https://app.transcend.io',
  })
    .getAllTools()
    .map((tool) => tool.name),
);

const sections = Object.values(TranscendPullResource);

describe('CLI parity', () => {
  it('maps every CLI section', () => {
    expect(Object.keys(CLI_SECTION_TOOLS).sort()).toEqual([...sections].sort());
  });

  it('only names tools that are registered', () => {
    const unknown = sections.flatMap((section) =>
      [...CLI_SECTION_TOOLS[section].read, ...CLI_SECTION_TOOLS[section].write]
        .filter((name) => !registered.has(name))
        .map((name) => `${section}: ${name}`),
    );
    expect(unknown).toEqual([]);
  });

  it('gives every section a read tool', () => {
    const missing = sections.filter((section) => CLI_SECTION_TOOLS[section].read.length === 0);
    expect(missing, 'Add a read tool for each section').toEqual([]);
  });

  it('gives every section a write tool unless it is read only by design', () => {
    const missing = sections.filter(
      (section) =>
        CLI_SECTION_TOOLS[section].write.length === 0 && !READ_ONLY_BY_DESIGN.includes(section),
    );
    expect(missing, 'Add a write tool for each section').toEqual([]);
  });

  it('keeps read only by design sections without write tools', () => {
    for (const section of READ_ONLY_BY_DESIGN) {
      expect(CLI_SECTION_TOOLS[section].write).toEqual([]);
    }
  });
});
