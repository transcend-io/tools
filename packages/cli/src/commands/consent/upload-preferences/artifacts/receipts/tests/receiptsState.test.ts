import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { makeReceiptsState } from '../receiptsState.js';

const failing = {
  row3: {
    uploadedAt: '2025-08-07T00:00:00.000Z',
    error: 'boom',
    update: {
      partition: 'partition-1',
      timestamp: '2025-08-07T00:00:00.000Z',
      identifiers: [{ name: 'email', value: 'test@example.com' }],
    },
  },
};

describe('makeReceiptsState', () => {
  it('creates an empty receipts store and persists updates', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'cli-receipts-state-'));
    const receiptsFilepath = join(tempDir, 'receipts.json');

    const receipts = await makeReceiptsState(receiptsFilepath);

    expect(receipts.receiptsFilepath).toBe(receiptsFilepath);
    expect(receipts.getPending()).toEqual({});
    expect(receipts.getSuccessful()).toEqual({});
    expect(receipts.getFailing()).toEqual({});

    await receipts.setPending({ row1: true });
    await receipts.setSuccessful({ row2: true });
    await receipts.setFailing(failing);

    expect(receipts.getPending()).toEqual({ row1: true });
    expect(receipts.getSuccessful()).toEqual({ row2: true });
    expect(receipts.getFailing()).toEqual(failing);

    const reopened = await makeReceiptsState(receiptsFilepath);
    expect(reopened.getSuccessful()).toEqual({ row2: true });
    expect(reopened.getFailing()).toEqual(failing);
  });

  it('resetPending clears pending buckets but keeps successes and failures', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'cli-receipts-state-'));
    const receiptsFilepath = join(tempDir, 'receipts.json');
    const receipts = await makeReceiptsState(receiptsFilepath);

    await receipts.setPending({ row1: true });
    await receipts.setPendingSafe({ row1: true });
    await receipts.setSkipped({ row4: { email: 'skip@example.com' } });
    await receipts.setSuccessful({ row2: true });
    await receipts.setFailing(failing);

    await receipts.resetPending();

    const onDisk = JSON.parse(await readFile(receiptsFilepath, 'utf8'));
    expect(onDisk).toMatchObject({
      pendingUpdates: {},
      pendingSafeUpdates: {},
      skippedUpdates: {},
      pendingConflictUpdates: {},
      successfulUpdates: { row2: true },
      failingUpdates: failing,
    });
  });
});
