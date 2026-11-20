import { TranscendRestClient, type AuthCredentials } from '@transcend-io/mcp-server-base';
import { TranscendPullResource } from '@transcend-io/sdk';
import { describe, expect, it } from 'vitest';

import { TranscendGraphQLClient } from '../src/graphql-client.js';
import { ToolRegistry } from '../src/registry.js';
import {
  CLI_SECTION_TOOLS,
  PENDING_GAPS,
  READ_ONLY_BY_DESIGN,
  type SectionGap,
} from './cli-parity-map.js';

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

  it('gives every section a read tool unless it is pending', () => {
    const missing = sections.filter(
      (section) => CLI_SECTION_TOOLS[section].read.length === 0 && !PENDING_GAPS[section]?.read,
    );
    expect(missing, 'Add a read tool, or list the section in PENDING_GAPS').toEqual([]);
  });

  it('gives every section a write tool unless it is pending or read only by design', () => {
    const missing = sections.filter(
      (section) =>
        CLI_SECTION_TOOLS[section].write.length === 0 &&
        !PENDING_GAPS[section]?.write &&
        !READ_ONLY_BY_DESIGN.includes(section),
    );
    expect(missing, 'Add a write tool, or list the section in PENDING_GAPS').toEqual([]);
  });

  it('keeps PENDING_GAPS free of entries that are no longer true', () => {
    const stale = (
      Object.entries(PENDING_GAPS) as Array<[TranscendPullResource, SectionGap]>
    ).flatMap(([section, gap]) => [
      ...(gap.read && CLI_SECTION_TOOLS[section].read.length > 0 ? [`${section}.read`] : []),
      ...(gap.write && CLI_SECTION_TOOLS[section].write.length > 0 ? [`${section}.write`] : []),
    ]);
    expect(stale, 'Remove these from PENDING_GAPS').toEqual([]);
  });

  it('does not list a read only by design section as a write gap', () => {
    for (const section of READ_ONLY_BY_DESIGN) {
      expect(PENDING_GAPS[section]?.write).toBeUndefined();
      expect(CLI_SECTION_TOOLS[section].write).toEqual([]);
    }
  });
});
