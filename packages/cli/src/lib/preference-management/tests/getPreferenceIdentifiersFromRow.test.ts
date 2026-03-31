import type { FileFormatState } from '@transcend-io/sdk';
import { describe, it, expect } from 'vitest';

import { getPreferenceIdentifiersFromRow } from '../getPreferenceIdentifiersFromRow.js';

const columnToIdentifier: FileFormatState['columnToIdentifier'] = {
  email_col: { name: 'email', isUniqueOnPreferenceStore: true },
  user_id_col: { name: 'userId', isUniqueOnPreferenceStore: true },
  phone_col: { name: 'phone', isUniqueOnPreferenceStore: false },
};

describe('getPreferenceIdentifiersFromRow', () => {
  it('extracts identifiers for all mapped columns with values', () => {
    const result = getPreferenceIdentifiersFromRow({
      row: {
        email_col: 'alice@example.com',
        user_id_col: 'u-123',
        phone_col: '+15551234567',
      },
      columnToIdentifier,
    });

    expect(result).toEqual([
      { name: 'email', value: 'alice@example.com' },
      { name: 'phone', value: '+15551234567' },
      { name: 'userId', value: 'u-123' },
    ]);
  });

  it('sorts email to the front', () => {
    const result = getPreferenceIdentifiersFromRow({
      row: {
        user_id_col: 'u-1',
        email_col: 'bob@example.com',
      },
      columnToIdentifier,
    });

    expect(result[0]).toEqual({ name: 'email', value: 'bob@example.com' });
    expect(result[1]).toEqual({ name: 'userId', value: 'u-1' });
  });

  it('sorts non-email identifiers alphabetically', () => {
    const mapping: FileFormatState['columnToIdentifier'] = {
      col_z: { name: 'zeta', isUniqueOnPreferenceStore: false },
      col_a: { name: 'alpha', isUniqueOnPreferenceStore: false },
      col_m: { name: 'mike', isUniqueOnPreferenceStore: false },
    };

    const result = getPreferenceIdentifiersFromRow({
      row: { col_z: 'z', col_a: 'a', col_m: 'm' },
      columnToIdentifier: mapping,
    });

    expect(result.map((r) => r.name)).toEqual(['alpha', 'mike', 'zeta']);
  });

  it('skips columns with empty string values', () => {
    const result = getPreferenceIdentifiersFromRow({
      row: {
        email_col: 'alice@example.com',
        user_id_col: '',
        phone_col: '+15551234567',
      },
      columnToIdentifier,
    });

    expect(result).toEqual([
      { name: 'email', value: 'alice@example.com' },
      { name: 'phone', value: '+15551234567' },
    ]);
  });

  it('skips columns missing from the row', () => {
    const result = getPreferenceIdentifiersFromRow({
      row: { email_col: 'alice@example.com' },
      columnToIdentifier,
    });

    expect(result).toEqual([{ name: 'email', value: 'alice@example.com' }]);
  });

  it('returns empty array when no columns match', () => {
    const result = getPreferenceIdentifiersFromRow({
      row: { unrelated: 'value' },
      columnToIdentifier,
    });

    expect(result).toEqual([]);
  });

  it('returns empty array for empty columnToIdentifier', () => {
    const result = getPreferenceIdentifiersFromRow({
      row: { email_col: 'alice@example.com' },
      columnToIdentifier: {},
    });

    expect(result).toEqual([]);
  });
});
