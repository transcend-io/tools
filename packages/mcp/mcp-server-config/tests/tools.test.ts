import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { ToolClients } from '@transcend-io/mcp-server-base';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({
  pull: vi.fn(),
  sync: vi.fn(),
}));

vi.mock('@transcend-io/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@transcend-io/sdk')>()),
  pullTranscendConfiguration: sdk.pull,
  syncConfigurationToTranscend: sdk.sync,
  previewPush: vi.fn(),
}));

vi.mock('@transcend-io/mcp-server-base', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@transcend-io/mcp-server-base')>()),
  createGraphqlRequestClient: () => ({ marker: 'client' }),
}));

const { getConfigTools } = await import('../src/index.js');

const clients = {
  rest: {} as never,
  graphql: { effectiveAuth: () => ({ type: 'apiKey', apiKey: 'k' }) } as never,
  dashboardUrl: 'https://app.transcend.io',
} satisfies ToolClients;

const tools = getConfigTools(clients);
const tool = (name: string) => tools.find((t) => t.name === name)!;

function tempDir(): string {
  return mkdtempSync(path.join(tmpdir(), 'mcp-config-'));
}

describe('tool definitions', () => {
  it('exposes the five tools', () => {
    expect(tools.map((t) => t.name)).toEqual([
      'config_pull',
      'config_diff',
      'config_push',
      'config_preview_push',
      'config_get_schema',
    ]);
  });

  it('marks disk tools as local-filesystem only and gates push', () => {
    expect(tool('config_pull').requireLocalFilesystem).toBe(true);
    expect(tool('config_diff').requireLocalFilesystem).toBe(true);
    expect(tool('config_push').requireLocalFilesystem).toBe(true);
    expect(tool('config_get_schema').requireLocalFilesystem).toBeUndefined();
    expect(tool('config_diff').readOnly).toBe(true);
    expect(tool('config_diff').confirmation).toBeUndefined();
    expect(tool('config_push').confirmation?.hint).toBeTruthy();
    expect(tool('config_pull').confirmation).toBeUndefined();
  });
});

describe('config_pull', () => {
  beforeEach(() => {
    sdk.pull.mockReset();
    sdk.pull.mockResolvedValue({ 'data-silos': [{ title: 'Silo A', integrationName: 'server' }] });
  });

  it('writes yaml and returns counts without contents', async () => {
    const filePath = path.join(tempDir(), 'out', 'transcend.yml');

    const result = (await tool('config_pull').handler({
      filePath,
      resources: ['dataSilos'],
    })) as { sections: Record<string, number>; filePath: string };

    expect(result.sections).toEqual({ 'data-silos': 1 });
    expect(JSON.stringify(result)).not.toContain('Silo A');
    expect(readFileSync(filePath, 'utf-8')).toContain('Silo A');
    expect(sdk.pull.mock.calls[0]![1]).toMatchObject({
      resources: ['dataSilos'],
      pageSize: 50,
      dataSiloIds: [],
    });
  });

  it('expands "all" to every resource', async () => {
    const filePath = path.join(tempDir(), 'transcend.yml');
    await tool('config_pull').handler({ filePath, resources: ['all'] });
    expect(sdk.pull.mock.calls[0]![1].resources.length).toBeGreaterThan(25);
  });

  it('rejects unknown section names and lists the valid ones', async () => {
    const filePath = path.join(tempDir(), 'transcend.yml');
    await expect(tool('config_pull').handler({ filePath, resources: ['nope'] })).rejects.toThrow(
      /Unknown sections: nope\. Valid sections: .*dataSilos/,
    );
    await expect(
      tool('config_pull').handler({ filePath, trackerStatuses: ['JUNK'] }),
    ).rejects.toThrow(/Valid: LIVE, NEEDS_REVIEW/);
    expect(sdk.pull).not.toHaveBeenCalled();
  });

  it('refuses to overwrite unless asked', async () => {
    const filePath = path.join(tempDir(), 'transcend.yml');
    writeFileSync(filePath, 'existing: true\n');

    await expect(tool('config_pull').handler({ filePath })).rejects.toThrow(/already exists/);
    expect(readFileSync(filePath, 'utf-8')).toBe('existing: true\n');
    expect(sdk.pull).not.toHaveBeenCalled();

    await tool('config_pull').handler({ filePath, overwrite: true });
    expect(readFileSync(filePath, 'utf-8')).toContain('Silo A');
  });

  it('rejects non-yaml and relative paths before any request', async () => {
    await expect(tool('config_pull').handler({ filePath: '/tmp/x.txt' })).rejects.toThrow();
    await expect(tool('config_pull').handler({ filePath: 'x.yml' })).rejects.toThrow();
    expect(sdk.pull).not.toHaveBeenCalled();
    expect(existsSync('/tmp/x.txt')).toBe(false);
  });
});

describe('config_push', () => {
  beforeEach(() => {
    sdk.sync.mockReset();
    sdk.sync.mockResolvedValue({ success: true, errors: [] });
  });

  it('syncs the parsed file and drops empty sections', async () => {
    const filePath = path.join(tempDir(), 'transcend.yml');
    writeFileSync(filePath, 'enrichers: []\nbusiness-entities:\n  - title: Acme\n');

    const result = (await tool('config_push').handler({
      filePath,
      publishToPrivacyCenter: true,
    })) as { success: boolean; sections: Record<string, number>; requiredScopes: string[] };

    expect(result.success).toBe(true);
    expect(result.sections).toEqual({ 'business-entities': 1 });
    expect(result.requiredScopes).toEqual(['manageDataInventory']);
    const [input, , options] = sdk.sync.mock.calls[0]!;
    expect(Object.keys(input)).toEqual(['business-entities']);
    expect(options).toMatchObject({ publishToPrivacyCenter: true, classifyService: false });
  });

  it('fills <<parameters.x>> variables', async () => {
    const filePath = path.join(tempDir(), 'transcend.yml');
    writeFileSync(filePath, 'business-entities:\n  - title: <<parameters.name>>\n');

    await tool('config_push').handler({ filePath, variables: { name: 'Acme' } });

    expect(sdk.sync.mock.calls[0]![0]['business-entities'][0].title).toBe('Acme');
  });

  it('reports a missing variable as a validation error', async () => {
    const filePath = path.join(tempDir(), 'transcend.yml');
    writeFileSync(filePath, 'business-entities:\n  - title: <<parameters.name>>\n');

    await expect(tool('config_push').handler({ filePath })).rejects.toThrow(/not a valid/);
    expect(sdk.sync).not.toHaveBeenCalled();
  });

  it('returns errors and logs when the sync fails', async () => {
    sdk.sync.mockResolvedValue({
      success: false,
      errors: [{ resource: 'business-entities', item: 'Acme', message: 'nope' }],
    });
    const filePath = path.join(tempDir(), 'transcend.yml');
    writeFileSync(filePath, 'business-entities:\n  - title: Acme\n');

    const result = (await tool('config_push').handler({ filePath })) as {
      success: boolean;
      errors: unknown[];
    };

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
  });

  it('reports a missing file', async () => {
    await expect(
      tool('config_push').handler({ filePath: path.join(tempDir(), 'missing.yml') }),
    ).rejects.toThrow(/Could not read/);
  });
});

describe('config_diff', () => {
  beforeEach(() => {
    sdk.pull.mockReset();
    sdk.pull.mockResolvedValue({
      vendors: [{ title: 'Segment', description: 'CDP' }],
    });
  });

  it('returns a fenced diff from the push plan', async () => {
    const filePath = path.join(tempDir(), 'transcend.yml');
    writeFileSync(
      filePath,
      'vendors:\n  - title: Segment\n    description: Customer data platform\n',
    );

    const envelope = (await tool('config_diff').handler({ filePath })) as {
      success: boolean;
      data: { diff: string; hasChanges: boolean; nextStep: string };
    };

    expect(envelope.success).toBe(true);
    expect(envelope.data.hasChanges).toBe(true);
    expect(envelope.data.diff.startsWith('```diff')).toBe(true);
    expect(envelope.data.diff).toContain('Customer data platform');
    expect(envelope.data.diff).toContain('CDP');
    expect(envelope.data.nextStep).toContain('config_push');
    expect(sdk.pull.mock.calls[0]![1]).toMatchObject({
      resources: ['vendors'],
      dataSiloIds: [],
      integrationNames: [],
    });
  });
});

describe('config_get_schema', () => {
  it('returns a section catalog without resources', async () => {
    const result = (await tool('config_get_schema').handler({})) as {
      schema?: { properties: Record<string, unknown> };
      keyBySection: Record<string, string>;
      validSections: string[];
      hint: string;
    };
    expect(result.schema).toBeUndefined();
    expect(result.keyBySection.dataSilos).toBe('data-silos');
    expect(result.validSections).toContain('dataSilos');
    expect(result.hint).toContain('resources');
  });

  it('returns the full schema when includeFullSchema is true', async () => {
    const { schema, keyBySection, warning } = (await tool('config_get_schema').handler({
      includeFullSchema: true,
    })) as {
      schema: { properties: Record<string, unknown> };
      keyBySection: Record<string, string>;
      warning: string;
    };
    expect(Object.keys(schema.properties)).toContain('data-silos');
    expect(keyBySection.dataSilos).toBe('data-silos');
    expect(warning).toContain('160k tokens');
  });

  it('narrows to chosen sections', async () => {
    const { schema, keyBySection } = (await tool('config_get_schema').handler({
      resources: ['dataSilos', 'purposes'],
    })) as {
      schema: { properties: Record<string, unknown> };
      keyBySection: Record<string, string>;
    };

    expect(Object.keys(schema.properties).sort()).toEqual(Object.values(keyBySection).sort());
    expect(Object.keys(schema.properties)).not.toContain('enrichers');
  });
});
