import fs from 'node:fs';

import { ConsentTrackerStatus } from '@transcend-io/privacy-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildContextForTest } from '../../../../lib/tests/helpers/buildContextForTest.js';
import { uploadCookiesFromCsv, type UploadCookiesFromCsvCommandFlags } from '../impl.js';

const mocks = vi.hoisted(() => {
  const client = { kind: 'client' };

  return {
    client,
    buildTranscendGraphQLClient: vi.fn(() => client),
    syncCookies: vi.fn(),
  };
});

vi.mock('@transcend-io/sdk', () => ({
  buildTranscendGraphQLClient: mocks.buildTranscendGraphQLClient,
  syncCookies: mocks.syncCookies,
}));

const readFileSync = vi.fn(() => 'Name,Purpose\nsession,Analytics\n');
const context = buildContextForTest({
  env: { DEVELOPMENT_MODE_VALIDATE_ONLY: 'false' },
  fs: {
    ...fs,
    readFileSync: readFileSync as unknown as typeof fs.readFileSync,
  },
});

const flags: UploadCookiesFromCsvCommandFlags = {
  auth: 'test-auth',
  trackerStatus: ConsentTrackerStatus.Live,
  file: '/tmp/cookies.csv',
  transcendUrl: 'https://api.example.com',
};

describe('uploadCookiesFromCsv', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    context.reset();
    readFileSync.mockReturnValue('Name,Purpose\nsession,Analytics\n');
    mocks.syncCookies.mockResolvedValue([]);
  });

  it('reads, maps, and uploads cookies through command-owned dependencies', async () => {
    await uploadCookiesFromCsv.call(context, flags);

    expect(readFileSync).toHaveBeenCalledWith('/tmp/cookies.csv', 'utf8');
    expect(mocks.buildTranscendGraphQLClient).toHaveBeenCalledWith(
      'https://api.example.com',
      'test-auth',
    );
    expect(mocks.syncCookies).toHaveBeenCalledWith(
      mocks.client,
      [
        expect.objectContaining({
          name: 'session',
          trackingPurposes: ['Analytics'],
          status: ConsentTrackerStatus.Live,
        }),
      ],
      { logger: context.logger },
    );
    expect(context.stdout).toContain('Reading "/tmp/cookies.csv" from disk');
    expect(context.exit).not.toHaveBeenCalled();
  });

  it('reports upload failure through the command context', async () => {
    mocks.syncCookies.mockResolvedValueOnce(undefined);

    await expect(uploadCookiesFromCsv.call(context, flags)).rejects.toMatchObject({ code: 1 });

    expect(context.stderr).toContain('Encountered error(s) syncing cookies from CSV');
    expect(context.exit).toHaveBeenCalledWith(1);
  });
});
