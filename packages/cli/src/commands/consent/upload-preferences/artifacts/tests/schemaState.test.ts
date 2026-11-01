import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { makeSchemaState } from '../schemaState.js';

describe('makeSchemaState', () => {
  it('starts empty when the schema file does not exist', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'cli-schema-state-'));
    const schema = await makeSchemaState(join(tempDir, 'schema.json'));

    expect(schema.getColumnToIdentifier()).toEqual({});
    expect(schema.getColumnToPurposeName()).toEqual({});
    expect(schema.getTimestampColumn()).toBeUndefined();
    expect(schema.getColumnToMetadata()).toBeUndefined();
    expect(schema.getColumnsToIgnore()).toEqual([]);
  });

  it('reads an existing schema file', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'cli-schema-state-'));
    const filepath = join(tempDir, 'schema.json');
    const fileFormat = {
      lastFetchedAt: '2026-01-01T00:00:00.000Z',
      columnToIdentifier: {
        email: { name: 'email', isUniqueOnPreferenceStore: true },
        uid: { name: 'userId', isUniqueOnPreferenceStore: true },
      },
      columnToPurposeName: {
        marketing: {
          purpose: 'Marketing',
          preference: null,
          valueMapping: { true: true, false: false },
        },
      },
      timestampColumn: 'ts',
      columnToMetadata: { source: { key: 'signupSource' } },
      columnsToIgnore: ['notes'],
    };
    await writeFile(filepath, JSON.stringify(fileFormat));

    const schema = await makeSchemaState(filepath);

    expect(schema.getColumnToIdentifier()).toEqual(fileFormat.columnToIdentifier);
    expect(schema.getColumnToPurposeName()).toEqual(fileFormat.columnToPurposeName);
    expect(schema.getTimestampColumn()).toBe('ts');
    expect(schema.getColumnToMetadata()).toEqual({ source: { key: 'signupSource' } });
    expect(schema.getColumnsToIgnore()).toEqual(['notes']);
  });
});
