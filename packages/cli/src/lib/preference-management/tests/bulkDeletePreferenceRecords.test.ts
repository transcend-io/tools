import fs from 'node:fs';

import type { Got } from 'got';
import { describe, expect, it, vi } from 'vitest';

import { bulkDeletePreferenceRecords } from '../bulkDeletePreferenceRecords.js';

describe('bulkDeletePreferenceRecords', () => {
  it('uses the injected filesystem and logger dependencies', async () => {
    const readFileSync = vi.fn(() => 'name,value\nemail,user@example.com');
    const json = vi.fn(async () => ({
      records: [{ success: true }],
      failures: [],
    }));
    const post = vi.fn(() => ({ json }));
    const logger = {
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      log: vi.fn(),
      warn: vi.fn(),
    };

    const result = await bulkDeletePreferenceRecords(
      { post } as unknown as Got,
      {
        partition: 'users',
        filePath: '/preferences/delete.csv',
        timestamp: new Date('2026-09-05T12:00:00.000Z'),
        maxItemsInChunk: 10,
        maxConcurrency: 1,
      },
      {
        fs: {
          readFileSync: readFileSync as unknown as typeof fs.readFileSync,
        },
        logger,
      },
    );

    expect(result).toEqual([]);
    expect(readFileSync).toHaveBeenCalledWith('/preferences/delete.csv', 'utf-8');
    expect(post).toHaveBeenCalledWith('v1/preferences/users/delete', {
      json: {
        records: [
          {
            anchorIdentifier: {
              name: 'email',
              value: 'user@example.com',
            },
            timestamp: '2026-09-05T12:00:00.000Z',
          },
        ],
      },
    });
  });
});
