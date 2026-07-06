import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { makeReceiptsState } from '../receiptsState.js';

describe('makeReceiptsState', () => {
  it('creates an empty receipts store and persists updates', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'cli-receipts-state-'));
    const receiptsFilepath = join(tempDir, 'receipts.json');

    const receipts = await makeReceiptsState(receiptsFilepath);

    expect(receipts.receiptsFilepath).toBe(receiptsFilepath);
    expect(receipts.getPending()).toEqual({});
    expect(receipts.getSuccessful()).toEqual({});
    expect(receipts.getFailing()).toEqual({});

    await receipts.setPending({
      row1: true,
    });
    await receipts.setSuccessful({
      row2: true,
    });
    await receipts.setFailing({
      row3: {
        uploadedAt: '2025-08-07T00:00:00.000Z',
        error: 'boom',
        update: {
          partition: 'partition-1',
          timestamp: '2025-08-07T00:00:00.000Z',
          identifiers: [{ name: 'email', value: 'test@example.com' }],
        },
      },
    });

    expect(receipts.getPending()).toEqual({ row1: true });
    expect(receipts.getSuccessful()).toEqual({ row2: true });
    expect(receipts.getFailing()).toEqual({
      row3: {
        uploadedAt: '2025-08-07T00:00:00.000Z',
        error: 'boom',
        update: {
          partition: 'partition-1',
          timestamp: '2025-08-07T00:00:00.000Z',
          identifiers: [{ name: 'email', value: 'test@example.com' }],
        },
      },
    });
  });
});
