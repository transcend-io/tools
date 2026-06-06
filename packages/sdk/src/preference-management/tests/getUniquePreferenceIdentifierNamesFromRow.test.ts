import { describe, it, expect } from 'vitest';

import type { FileFormatState } from '../codecs.js';
import { getUniquePreferenceIdentifierNamesFromRow } from '../getUniquePreferenceIdentifierNamesFromRow.js';

const columnToIdentifier: FileFormatState['columnToIdentifier'] = {
  email_col: { name: 'email', isUniqueOnPreferenceStore: true },
  user_id_col: { name: 'userId', isUniqueOnPreferenceStore: true },
  phone_col: { name: 'phone', isUniqueOnPreferenceStore: false },
};

describe('getUniquePreferenceIdentifierNamesFromRow', () => {
  it('returns only unique identifiers that have values', () => {
    const result = getUniquePreferenceIdentifierNamesFromRow({
      row: {
        email_col: 'alice@example.com',
        user_id_col: 'u-123',
        phone_col: '+15551234567',
      },
      columnToIdentifier,
    });

    expect(result).toEqual([
      {
        name: 'email',
        isUniqueOnPreferenceStore: true,
        columnName: 'email_col',
        value: 'alice@example.com',
      },
      {
        name: 'userId',
        isUniqueOnPreferenceStore: true,
        columnName: 'user_id_col',
        value: 'u-123',
      },
    ]);
  });

  it('excludes non-unique identifiers', () => {
    const result = getUniquePreferenceIdentifierNamesFromRow({
      row: { phone_col: '+15551234567' },
      columnToIdentifier,
    });

    expect(result).toEqual([]);
  });

  it('sorts email to the front', () => {
    const result = getUniquePreferenceIdentifierNamesFromRow({
      row: {
        user_id_col: 'u-1',
        email_col: 'bob@example.com',
      },
      columnToIdentifier,
    });

    expect(result[0]!.name).toBe('email');
    expect(result[1]!.name).toBe('userId');
  });

  it('sorts non-email unique identifiers alphabetically', () => {
    const mapping: FileFormatState['columnToIdentifier'] = {
      col_z: { name: 'zeta', isUniqueOnPreferenceStore: true },
      col_a: { name: 'alpha', isUniqueOnPreferenceStore: true },
    };

    const result = getUniquePreferenceIdentifierNamesFromRow({
      row: { col_z: 'z', col_a: 'a' },
      columnToIdentifier: mapping,
    });

    expect(result.map((r) => r.name)).toEqual(['alpha', 'zeta']);
  });

  it('skips columns with empty string values', () => {
    const result = getUniquePreferenceIdentifierNamesFromRow({
      row: {
        email_col: 'alice@example.com',
        user_id_col: '',
      },
      columnToIdentifier,
    });

    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe('email');
  });

  it('skips columns missing from the row', () => {
    const result = getUniquePreferenceIdentifierNamesFromRow({
      row: { email_col: 'alice@example.com' },
      columnToIdentifier,
    });

    expect(result).toEqual([
      {
        name: 'email',
        isUniqueOnPreferenceStore: true,
        columnName: 'email_col',
        value: 'alice@example.com',
      },
    ]);
  });

  it('returns empty array when no columns match', () => {
    const result = getUniquePreferenceIdentifierNamesFromRow({
      row: { unrelated: 'value' },
      columnToIdentifier,
    });

    expect(result).toEqual([]);
  });

  it('returns empty array for empty columnToIdentifier', () => {
    const result = getUniquePreferenceIdentifierNamesFromRow({
      row: { email_col: 'alice@example.com' },
      columnToIdentifier: {},
    });

    expect(result).toEqual([]);
  });
});
