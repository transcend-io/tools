import { describe, it, expect, vi, beforeEach } from 'vitest';

import { readFailingUpdatesFromReceipt } from '../readFailingUpdatesFromReceipt.js';

const readFileSync = vi.fn();
const dependencies = {
  filesystem: {
    readFileSync,
  },
};

describe('readFailingUpdatesFromReceipt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses failing updates (happy path) and includes sourceFile', () => {
    readFileSync.mockReturnValueOnce(
      JSON.stringify({
        failingUpdates: {
          'pk-1': {
            uploadedAt: '2025-08-15T00:00:00.000Z',
            error: 'Bad thing',
            update: { purpose: 'Marketing', enabled: false },
          },
          'pk-2': {
            uploadedAt: '2025-08-16T10:11:12.000Z',
            error: 'Oops',
            update: { purpose: 'Email', enabled: true },
          },
        },
      }),
    );

    const out = readFailingUpdatesFromReceipt('/path/receipts.json', '/src/file.csv', dependencies);

    expect(out).toEqual([
      {
        primaryKey: 'pk-1',
        uploadedAt: '2025-08-15T00:00:00.000Z',
        error: 'Bad thing',
        updateJson: JSON.stringify({ purpose: 'Marketing', enabled: false }),
        sourceFile: '/src/file.csv',
      },
      {
        primaryKey: 'pk-2',
        uploadedAt: '2025-08-16T10:11:12.000Z',
        error: 'Oops',
        updateJson: JSON.stringify({ purpose: 'Email', enabled: true }),
        sourceFile: '/src/file.csv',
      },
    ]);

    expect(readFileSync).toHaveBeenCalledWith('/path/receipts.json', 'utf8');
  });

  it('fills defaults when fields are missing and omits updateJson when update is absent', () => {
    readFileSync.mockReturnValueOnce(
      JSON.stringify({
        failingUpdates: {
          'pk-1': {}, // all missing -> defaults
          'pk-2': { uploadedAt: 'X' }, // partial
        },
      }),
    );

    const out = readFailingUpdatesFromReceipt('/path/receipts.json', undefined, dependencies);

    expect(out).toEqual([
      {
        primaryKey: 'pk-1',
        uploadedAt: '',
        error: '',
        updateJson: '',
        sourceFile: undefined,
      },
      {
        primaryKey: 'pk-2',
        uploadedAt: 'X',
        error: '',
        updateJson: '',
        sourceFile: undefined,
      },
    ]);
  });

  it('returns [] when failingUpdates is empty object', () => {
    readFileSync.mockReturnValueOnce(JSON.stringify({ failingUpdates: {} }));
    const out = readFailingUpdatesFromReceipt('/path/receipts.json', undefined, dependencies);
    expect(out).toEqual([]);
  });

  it('returns [] when failingUpdates key is missing entirely', () => {
    readFileSync.mockReturnValueOnce(JSON.stringify({ someOtherKey: 1 }));
    const out = readFailingUpdatesFromReceipt('/path/receipts.json', undefined, dependencies);
    expect(out).toEqual([]);
  });

  it('returns [] on invalid JSON', () => {
    readFileSync.mockReturnValueOnce('{not json}');
    const out = readFailingUpdatesFromReceipt('/path/receipts.json', undefined, dependencies);
    expect(out).toEqual([]);
  });

  it('returns [] when readFileSync throws', () => {
    readFileSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });
    const out = readFailingUpdatesFromReceipt('/path/missing.json', undefined, dependencies);
    expect(out).toEqual([]);
  });
});
