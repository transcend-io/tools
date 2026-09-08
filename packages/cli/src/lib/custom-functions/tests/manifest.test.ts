import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  insertCustomFunctionManifestEntry,
  isCustomFunctionManifestPathContained,
  parseCustomFunctionsManifest,
  readCustomFunctionsManifest,
  type CustomFunctionManifestEntry,
  writeCustomFunctionIdsToManifest,
} from '../manifest.js';

const MANIFEST = `# Custom functions synced from this repo
functions:
  # Scores inbound leads
  - name: Score Lead
    code: ./functions/score-lead.ts
    env:
      CRM_API_KEY: <<parameters.crmApiKey>>
  - id: existing-id-2
    name: Duplicated Name
    code: ./functions/a.ts
  - id: existing-id-3
    name: Duplicated Name
    code: ./functions/b.ts
`;

/**
 * Write a manifest (and stub code files) into a temp directory
 *
 * @param contents - Manifest YAML contents
 * @returns The manifest file path
 */
function writeFixture(contents: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'cf-manifest-'));
  writeFileSync(join(dir, 'transcend-functions.yml'), contents);
  const functionsDir = join(dir, 'functions');
  mkdirSync(functionsDir, { recursive: true });
  ['score-lead.ts', 'a.ts', 'b.ts'].forEach((file) => {
    writeFileSync(join(functionsDir, file), 'export default async () => 1;');
  });
  return join(dir, 'transcend-functions.yml');
}

describe('parseCustomFunctionsManifest', () => {
  it('parses unresolved parameters without reading referenced files', () => {
    const manifest = parseCustomFunctionsManifest(`functions:
  - name: Pure Parse
    code: ./functions/does-not-exist.ts
    env:
      API_KEY: <<parameters.apiKey>>
`);

    expect(manifest.functions[0]).toMatchObject({
      name: 'Pure Parse',
      code: './functions/does-not-exist.ts',
      env: { API_KEY: '<<parameters.apiKey>>' },
    });
  });

  it('rejects duplicate ids', () => {
    expect(() =>
      parseCustomFunctionsManifest(`functions:
  - id: same-id
    name: One
    code: ./functions/a.ts
  - id: same-id
    name: Two
    code: ./functions/b.ts
`),
    ).toThrow(/Duplicate custom function ids in manifest: same-id/);
  });

  it('rejects duplicate id-less names', () => {
    expect(() =>
      parseCustomFunctionsManifest(`functions:
  - name: Same Name
    code: ./functions/a.ts
  - name: Same Name
    code: ./functions/b.ts
`),
    ).toThrow(/Duplicate custom function names in manifest without ids: Same Name/);
  });

  it('allows duplicate names when every duplicate has an id', () => {
    expect(
      parseCustomFunctionsManifest(`functions:
  - id: first-id
    name: Same Name
    code: ./functions/a.ts
  - id: second-id
    name: Same Name
    code: ./functions/b.ts
`).functions,
    ).toHaveLength(2);
  });

  it('rejects mutually exclusive test payload fields', () => {
    expect(() =>
      parseCustomFunctionsManifest(`functions:
  - name: Conflicted
    code: ./functions/a.ts
    test-payload: ./test-payloads/a.json
    test-payloads:
      - payload: ./test-payloads/a.json
`),
    ).toThrow(/sets both test-payload and test-payloads/);
  });

  it('rejects test-payload-type without the shorthand test-payload', () => {
    expect(() =>
      parseCustomFunctionsManifest(`functions:
  - name: Typed Without Payload
    code: ./functions/a.ts
    test-payload-type: REQUEST_ENRICHER
`),
    ).toThrow(/sets test-payload-type without test-payload/);
  });

  it('rejects unsupported test payload types through the manifest codec', () => {
    expect(() =>
      parseCustomFunctionsManifest(`functions:
  - name: Unsupported Type
    code: ./functions/a.ts
    test-payload: ./test-payloads/a.json
    test-payload-type: MAESTRO
`),
    ).toThrow();
  });

  it('rejects DSR payload types on General functions', () => {
    expect(() =>
      parseCustomFunctionsManifest(`functions:
  - name: General With Typed Payload
    code: ./functions/a.ts
    test-payload: ./test-payloads/a.json
    test-payload-type: DATA_POINT
`),
    ).toThrow(/sets a DSR payload type but is not type DSR/);
    expect(() =>
      parseCustomFunctionsManifest(`functions:
  - name: General With Typed Payload List
    code: ./functions/a.ts
    test-payloads:
      - payload: ./test-payloads/a.json
        payload-type: REQUEST_ENRICHER
`),
    ).toThrow(/sets a DSR payload type but is not type DSR/);
  });

  it('rejects referenced paths outside the manifest directory', () => {
    expect(() =>
      parseCustomFunctionsManifest(`functions:
  - name: Escaped Code
    code: ../outside.ts
`),
    ).toThrow(/code path outside the manifest directory/);
    expect(() =>
      parseCustomFunctionsManifest(`functions:
  - name: Escaped Payload
    code: ./functions/a.ts
    test-payload: /tmp/payload.json
`),
    ).toThrow(/test-payload path outside the manifest directory/);
    expect(() =>
      parseCustomFunctionsManifest(`functions:
  - name: Escaped Payload List
    code: ./functions/a.ts
    test-payloads:
      - payload: ../../payload.json
`),
    ).toThrow(/test-payloads\[0\]\.payload path outside the manifest directory/);
  });

  it('exposes reusable lexical path containment checking', () => {
    expect(isCustomFunctionManifestPathContained('./functions/a.ts')).toBe(true);
    expect(isCustomFunctionManifestPathContained('functions/../functions/a.ts')).toBe(true);
    expect(isCustomFunctionManifestPathContained('../outside.ts')).toBe(false);
    expect(isCustomFunctionManifestPathContained('/tmp/outside.ts')).toBe(false);
  });
});

describe('readCustomFunctionsManifest', () => {
  it('rejects parent-relative source paths', () => {
    const manifestPath = writeFixture(`functions:
  - name: Shared source
    code: ../shared.ts
`);

    expect(() => readCustomFunctionsManifest(manifestPath)).toThrow(
      /code path outside the manifest directory/,
    );
  });

  it('applies path validation before reading source and payload files', () => {
    const manifestPath = writeFixture(`functions:
  - name: Validated paths
    code: ./functions/a.ts
    test-payload: ./test-payloads/a.json
`);
    const manifestDirectory = dirname(manifestPath);
    mkdirSync(join(manifestDirectory, 'test-payloads'));
    writeFileSync(join(manifestDirectory, 'test-payloads', 'a.json'), '{}');
    const validatedPaths: string[] = [];

    readCustomFunctionsManifest(manifestPath, {}, (path) => validatedPaths.push(path));

    expect(validatedPaths).toEqual([
      join(manifestDirectory, 'functions', 'a.ts'),
      join(manifestDirectory, 'test-payloads', 'a.json'),
    ]);
  });

  it('passes ids through and allows duplicate names when disambiguated by id', () => {
    const filePath = writeFixture(MANIFEST);
    const configs = readCustomFunctionsManifest(filePath, { crmApiKey: 'secret' });
    expect(configs.map(({ id }) => id)).toEqual([undefined, 'existing-id-2', 'existing-id-3']);
    expect(configs[0]!.env).toEqual({ CRM_API_KEY: 'secret' });
  });

  it('passes per-entry sombra gateway and auth env through', () => {
    const filePath = writeFixture(`functions:
  - name: EU Function
    code: ./functions/a.ts
    sombra-id: sombra-eu
    sombra-auth-env: SOMBRA_EU_INTERNAL_KEY
  - name: US Function
    code: ./functions/b.ts
`);
    const configs = readCustomFunctionsManifest(filePath);
    expect(configs[0]).toMatchObject({
      sombraId: 'sombra-eu',
      sombraAuthEnv: 'SOMBRA_EU_INTERNAL_KEY',
    });
    expect(configs[1]!.sombraId).toBeUndefined();
    expect(configs[1]!.sombraAuthEnv).toBeUndefined();
  });

  it('substitutes variables before parsing and hydrating referenced files', () => {
    const filePath = writeFixture(`functions:
  - name: Variable Path
    code: <<parameters.codePath>>
`);
    const configs = readCustomFunctionsManifest(filePath, { codePath: './functions/a.ts' });
    expect(configs[0]).toMatchObject({
      name: 'Variable Path',
      code: 'export default async () => 1;',
    });
  });

  it('loads and parses test payload files relative to the manifest', () => {
    const filePath = writeFixture(`functions:
  - name: With Test
    code: ./functions/a.ts
    type: DSR
    test-payload: ./test-payloads/with-test.json
    test-payload-type: REQUEST_ENRICHER
  - name: Without Test
    code: ./functions/b.ts
`);
    const dir = join(filePath, '..');
    mkdirSync(join(dir, 'test-payloads'), { recursive: true });
    writeFileSync(
      join(dir, 'test-payloads', 'with-test.json'),
      JSON.stringify({ lead: { email: 'test@example.com' } }),
    );

    const configs = readCustomFunctionsManifest(filePath);
    expect(configs[0]!.testPayloads).toEqual([
      {
        payload: { lead: { email: 'test@example.com' } },
        payloadType: 'REQUEST_ENRICHER',
      },
    ]);
    expect(configs[1]!.testPayloads).toBeUndefined();
  });

  it('loads a test-payloads list with per-payload types', () => {
    const filePath = writeFixture(`functions:
  - name: DSR Function
    code: ./functions/a.ts
    type: DSR
    test-payloads:
      - payload: ./test-payloads/access.json
        payload-type: DATA_POINT
      - payload: ./test-payloads/enrich.json
        payload-type: REQUEST_ENRICHER
`);
    const dir = join(filePath, '..');
    mkdirSync(join(dir, 'test-payloads'), { recursive: true });
    writeFileSync(join(dir, 'test-payloads', 'access.json'), JSON.stringify({ type: 'ACCESS' }));
    writeFileSync(join(dir, 'test-payloads', 'enrich.json'), JSON.stringify({ type: 'ENRICH' }));

    const configs = readCustomFunctionsManifest(filePath);
    expect(configs[0]!.testPayloads).toEqual([
      { payload: { type: 'ACCESS' }, payloadType: 'DATA_POINT' },
      { payload: { type: 'ENRICH' }, payloadType: 'REQUEST_ENRICHER' },
    ]);
  });

  it('rejects an entry that sets both test-payload and test-payloads', () => {
    const filePath = writeFixture(`functions:
  - name: Conflicted
    code: ./functions/a.ts
    test-payload: ./test-payloads/a.json
    test-payloads:
      - payload: ./test-payloads/a.json
`);
    expect(() => readCustomFunctionsManifest(filePath)).toThrow(
      /sets both test-payload and test-payloads/,
    );
  });

  it('rejects test-payload-type without test-payload', () => {
    const filePath = writeFixture(`functions:
  - name: Typed Without Payload
    code: ./functions/a.ts
    test-payload-type: REQUEST_ENRICHER
`);
    expect(() => readCustomFunctionsManifest(filePath)).toThrow(
      /sets test-payload-type without test-payload/,
    );
  });

  it('rejects a missing test payload file', () => {
    const filePath = writeFixture(`functions:
  - name: With Test
    code: ./functions/a.ts
    test-payload: ./test-payloads/nope.json
`);
    expect(() => readCustomFunctionsManifest(filePath)).toThrow(
      /Test payload file for custom function "With Test" does not exist/,
    );
  });

  it('rejects a test payload file with invalid JSON', () => {
    const filePath = writeFixture(`functions:
  - name: With Test
    code: ./functions/a.ts
    test-payload: ./test-payloads/bad.json
`);
    const dir = join(filePath, '..');
    mkdirSync(join(dir, 'test-payloads'), { recursive: true });
    writeFileSync(join(dir, 'test-payloads', 'bad.json'), '{ not json');
    expect(() => readCustomFunctionsManifest(filePath)).toThrow(
      /Test payload file for custom function "With Test" is not valid JSON/,
    );
  });

  it('rejects an invalid test-payload-type', () => {
    const filePath = writeFixture(`functions:
  - name: With Test
    code: ./functions/a.ts
    test-payload-type: MAESTRO
`);
    expect(() => readCustomFunctionsManifest(filePath)).toThrow();
  });

  it('rejects duplicate names without ids', () => {
    const filePath = writeFixture(`functions:
  - name: Same Name
    code: ./functions/a.ts
  - name: Same Name
    code: ./functions/b.ts
`);
    expect(() => readCustomFunctionsManifest(filePath)).toThrow(
      /Duplicate custom function names in manifest without ids: Same Name/,
    );
  });

  it('rejects duplicate ids', () => {
    const filePath = writeFixture(`functions:
  - id: same-id
    name: One
    code: ./functions/a.ts
  - id: same-id
    name: Two
    code: ./functions/b.ts
`);
    expect(() => readCustomFunctionsManifest(filePath)).toThrow(
      /Duplicate custom function ids in manifest: same-id/,
    );
  });
});

describe('insertCustomFunctionManifestEntry', () => {
  it('appends an entry while preserving comments, order, styles, and placeholders', () => {
    const contents = `# Manifest comment
functions:
  # Existing entry comment
  - name: 'Existing Function'
    code: "./functions/a.ts"
    env:
      API_KEY: <<parameters.apiKey>>
`;
    const updated = insertCustomFunctionManifestEntry(contents, {
      name: 'Added Function',
      code: './functions/b.ts',
      description: 'Added later',
    });

    expect(updated).toContain('# Manifest comment');
    expect(updated).toContain('# Existing entry comment');
    expect(updated).toContain("name: 'Existing Function'");
    expect(updated).toContain('code: "./functions/a.ts"');
    expect(updated).toContain('API_KEY: <<parameters.apiKey>>');
    expect(updated.indexOf('name: Added Function')).toBeGreaterThan(
      updated.indexOf("name: 'Existing Function'"),
    );
    expect(parseCustomFunctionsManifest(updated).functions).toEqual([
      {
        name: 'Existing Function',
        code: './functions/a.ts',
        env: { API_KEY: '<<parameters.apiKey>>' },
      },
      {
        name: 'Added Function',
        code: './functions/b.ts',
        description: 'Added later',
      },
    ]);
  });

  it('validates inserted entries with the manifest codec', () => {
    expect(() =>
      insertCustomFunctionManifestEntry('functions: []\n', {
        name: 'Missing Code',
      } as CustomFunctionManifestEntry),
    ).toThrow();
  });

  it('validates resulting duplicate-name semantics', () => {
    expect(() =>
      insertCustomFunctionManifestEntry(
        `functions:
  - name: Existing
    code: ./functions/a.ts
`,
        {
          name: 'Existing',
          code: './functions/b.ts',
        },
      ),
    ).toThrow(/Duplicate custom function names in manifest without ids: Existing/);
  });
});

describe('writeCustomFunctionIdsToManifest', () => {
  it('inserts ids for id-less entries, preserving comments and placeholders', () => {
    const filePath = writeFixture(MANIFEST);

    const updated = writeCustomFunctionIdsToManifest(filePath, [
      { id: 'new-id-1' },
      { id: 'should-not-overwrite' },
      undefined,
    ]);
    expect(updated).toBe(1);

    const contents = readFileSync(filePath, 'utf-8');
    // The new id is added as the first key of the first entry
    expect(contents).toContain('- id: new-id-1\n    name: Score Lead');
    // Existing ids are untouched
    expect(contents).toContain('id: existing-id-2');
    expect(contents).not.toContain('should-not-overwrite');
    // Comments and variable placeholders survive the round trip
    expect(contents).toContain('# Custom functions synced from this repo');
    expect(contents).toContain('# Scores inbound leads');
    expect(contents).toContain('CRM_API_KEY: <<parameters.crmApiKey>>');

    // The updated manifest still parses and now resolves the id
    const configs = readCustomFunctionsManifest(filePath, { crmApiKey: 'secret' });
    expect(configs[0]!.id).toBe('new-id-1');
  });

  it('inserts data-silo-id right after the id', () => {
    const filePath = writeFixture(MANIFEST);

    const updated = writeCustomFunctionIdsToManifest(filePath, [
      { id: 'new-id-1', dataSiloId: 'silo-1' },
      undefined,
      { dataSiloId: 'silo-3' },
    ]);
    expect(updated).toBe(2);

    const contents = readFileSync(filePath, 'utf-8');
    expect(contents).toContain('- id: new-id-1\n    data-silo-id: silo-1\n    name: Score Lead');
    // Entry with an existing id gets data-silo-id after it
    expect(contents).toContain('id: existing-id-3\n    data-silo-id: silo-3');

    const configs = readCustomFunctionsManifest(filePath, { crmApiKey: 'secret' });
    expect(configs[0]).toMatchObject({ id: 'new-id-1', dataSiloId: 'silo-1' });
    expect(configs[2]).toMatchObject({ id: 'existing-id-3', dataSiloId: 'silo-3' });
  });

  it('does not overwrite an existing data-silo-id', () => {
    const filePath = writeFixture(`functions:
  - id: cf-1
    name: DSR Function
    code: ./functions/a.ts
    type: DSR
    data-silo-id: silo-existing
`);
    expect(writeCustomFunctionIdsToManifest(filePath, [{ dataSiloId: 'silo-other' }])).toBe(0);
    const contents = readFileSync(filePath, 'utf-8');
    expect(contents).toContain('data-silo-id: silo-existing');
    expect(contents).not.toContain('silo-other');
  });

  it('is a no-op when every entry already has an id', () => {
    const filePath = writeFixture(MANIFEST);
    writeCustomFunctionIdsToManifest(filePath, [{ id: 'new-id-1' }, undefined, undefined]);
    const before = readFileSync(filePath, 'utf-8');
    expect(
      writeCustomFunctionIdsToManifest(filePath, [{ id: 'other-id' }, { id: 'x' }, { id: 'y' }]),
    ).toBe(0);
    expect(readFileSync(filePath, 'utf-8')).toBe(before);
  });
});
