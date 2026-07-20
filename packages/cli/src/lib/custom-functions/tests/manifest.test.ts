import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { readCustomFunctionsManifest, writeCustomFunctionIdsToManifest } from '../manifest.js';

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

describe('readCustomFunctionsManifest', () => {
  it('passes ids through and allows duplicate names when disambiguated by id', () => {
    const filePath = writeFixture(MANIFEST);
    const configs = readCustomFunctionsManifest(filePath, { crmApiKey: 'secret' });
    expect(configs.map(({ id }) => id)).toEqual([undefined, 'existing-id-2', 'existing-id-3']);
    expect(configs[0]!.env).toEqual({ CRM_API_KEY: 'secret' });
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

describe('writeCustomFunctionIdsToManifest', () => {
  it('inserts ids for id-less entries, preserving comments and placeholders', () => {
    const filePath = writeFixture(MANIFEST);

    const updated = writeCustomFunctionIdsToManifest(filePath, [
      'new-id-1',
      'should-not-overwrite',
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

  it('is a no-op when every entry already has an id', () => {
    const filePath = writeFixture(MANIFEST);
    writeCustomFunctionIdsToManifest(filePath, ['new-id-1', undefined, undefined]);
    const before = readFileSync(filePath, 'utf-8');
    expect(writeCustomFunctionIdsToManifest(filePath, ['other-id', 'x', 'y'])).toBe(0);
    expect(readFileSync(filePath, 'utf-8')).toBe(before);
  });
});
