import fs from 'node:fs';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildContextForTest } from '../../../../../lib/tests/helpers/buildContextForTest.js';
import {
  markRequestDataSilosCompleted,
  type MarkRequestDataSilosCompletedCommandFlags,
} from '../impl.js';

const mocks = vi.hoisted(() => ({
  markRequestDataSiloIdsCompleted: vi.fn(),
}));

vi.mock('../../../../../lib/cron/index.js', () => ({
  markRequestDataSiloIdsCompleted: mocks.markRequestDataSiloIdsCompleted,
}));

const readFileSync = vi.fn(() => 'Request Id\nrequest-1\nrequest-2\n');
const context = buildContextForTest({
  env: { DEVELOPMENT_MODE_VALIDATE_ONLY: 'false' },
  fs: {
    ...fs,
    readFileSync: readFileSync as unknown as typeof fs.readFileSync,
  },
});

const flags: MarkRequestDataSilosCompletedCommandFlags = {
  auth: 'test-auth',
  dataSiloId: 'data-silo-id',
  file: '/tmp/requests.csv',
  transcendUrl: 'https://api.example.com',
};

describe('markRequestDataSilosCompleted', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    context.reset();
    readFileSync.mockReturnValue('Request Id\nrequest-1\nrequest-2\n');
    mocks.markRequestDataSiloIdsCompleted.mockResolvedValue(undefined);
  });

  it('reads and maps request IDs through the command context', async () => {
    await markRequestDataSilosCompleted.call(context, flags);

    expect(readFileSync).toHaveBeenCalledWith('/tmp/requests.csv', 'utf8');
    expect(mocks.markRequestDataSiloIdsCompleted).toHaveBeenCalledWith({
      requestIds: ['request-1', 'request-2'],
      transcendUrl: 'https://api.example.com',
      auth: 'test-auth',
      dataSiloId: 'data-silo-id',
    });
    expect(context.stdout).toContain('Reading "/tmp/requests.csv" from disk');
    expect(context.exit).not.toHaveBeenCalled();
  });
});
