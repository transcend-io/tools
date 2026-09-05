import fs from 'node:fs';

import { ConsentTrackerStatus, DataFlowScope } from '@transcend-io/privacy-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildContextForTest } from '../../../../lib/tests/helpers/buildContextForTest.js';
import { uploadDataFlowsFromCsv, type UploadDataFlowsFromCsvCommandFlags } from '../impl.js';

const mocks = vi.hoisted(() => {
  const client = { kind: 'client' };

  return {
    client,
    buildTranscendGraphQLClient: vi.fn(() => client),
    syncDataFlows: vi.fn(),
  };
});

vi.mock('@transcend-io/sdk', () => ({
  buildTranscendGraphQLClient: mocks.buildTranscendGraphQLClient,
  syncDataFlows: mocks.syncDataFlows,
}));

const readFileSync = vi.fn(
  () => 'Connections Made To,Type,Purpose\napi.example.com,HOST,Analytics\n',
);
const context = buildContextForTest({
  env: { DEVELOPMENT_MODE_VALIDATE_ONLY: 'false' },
  fs: {
    ...fs,
    readFileSync: readFileSync as unknown as typeof fs.readFileSync,
  },
});

const flags: UploadDataFlowsFromCsvCommandFlags = {
  auth: 'test-auth',
  trackerStatus: ConsentTrackerStatus.Live,
  file: '/tmp/data-flows.csv',
  classifyService: true,
  transcendUrl: 'https://api.example.com',
};

describe('uploadDataFlowsFromCsv', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    context.reset();
    readFileSync.mockReturnValue(
      'Connections Made To,Type,Purpose\napi.example.com,HOST,Analytics\n',
    );
    mocks.syncDataFlows.mockResolvedValue([]);
  });

  it('reads, maps, and uploads data flows through command-owned dependencies', async () => {
    await uploadDataFlowsFromCsv.call(context, flags);

    expect(readFileSync).toHaveBeenCalledWith('/tmp/data-flows.csv', 'utf8');
    expect(mocks.buildTranscendGraphQLClient).toHaveBeenCalledWith(
      'https://api.example.com',
      'test-auth',
    );
    expect(mocks.syncDataFlows).toHaveBeenCalledWith(
      mocks.client,
      [
        expect.objectContaining({
          value: 'api.example.com',
          type: DataFlowScope.Host,
          trackingPurposes: ['Analytics'],
          status: ConsentTrackerStatus.Live,
        }),
      ],
      {
        classifyService: true,
        logger: context.logger,
      },
    );
    expect(context.stdout).toContain('Reading "/tmp/data-flows.csv" from disk');
    expect(context.exit).not.toHaveBeenCalled();
  });

  it('reports upload failure through the command context', async () => {
    mocks.syncDataFlows.mockResolvedValueOnce(undefined);

    await expect(uploadDataFlowsFromCsv.call(context, flags)).rejects.toMatchObject({ code: 1 });

    expect(context.stderr).toContain('Encountered error(s) syncing data flows from CSV');
    expect(context.exit).toHaveBeenCalledWith(1);
  });
});
