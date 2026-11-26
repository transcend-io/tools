import { ConsentBundleType } from '@transcend-io/privacy-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const H = vi.hoisted(() => ({
  client: { tag: 'client' },
  fetchConsentManagerId: vi.fn(),
  fetchConsentManagerRollbackTarget: vi.fn(),
  rollbackConsentManagerToTarget: vi.fn(),
}));

vi.mock('@transcend-io/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@transcend-io/sdk')>()),
  buildTranscendGraphQLClient: vi.fn(() => H.client),
  fetchConsentManagerId: H.fetchConsentManagerId,
  fetchConsentManagerRollbackTarget: H.fetchConsentManagerRollbackTarget,
  rollbackConsentManagerToTarget: H.rollbackConsentManagerToTarget,
}));

vi.mock('../../../logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { rollbackConsentManagerBundles } from '../rollbackConsentManagerBundles.js';

describe('rollbackConsentManagerBundles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    H.fetchConsentManagerId.mockResolvedValue('bundle-1');
    H.fetchConsentManagerRollbackTarget.mockImplementation((_client, { bundleType, version }) =>
      Promise.resolve({ version, deployedAt: '2024-01-01', input: { core: bundleType } }),
    );
    H.rollbackConsentManagerToTarget.mockResolvedValue(undefined);
  });

  it('rolls back each bundle type, TEST first', async () => {
    await rollbackConsentManagerBundles({
      auth: 'key',
      bundleTypes: [ConsentBundleType.Production, ConsentBundleType.Test],
      version: '1.0.0',
    });

    expect(H.rollbackConsentManagerToTarget.mock.calls.map(([, o]) => o.target.input.core)).toEqual(
      [ConsentBundleType.Test, ConsentBundleType.Production],
    );
  });

  it('changes nothing when any target is missing', async () => {
    H.fetchConsentManagerRollbackTarget
      .mockResolvedValueOnce({ version: '1.0.0', deployedAt: 'x', input: {} })
      .mockRejectedValueOnce(new Error('No earlier PRODUCTION deploy'));

    await expect(
      rollbackConsentManagerBundles({
        auth: 'key',
        bundleTypes: [ConsentBundleType.Test, ConsentBundleType.Production],
        version: '1.0.0',
      }),
    ).rejects.toThrow('No earlier PRODUCTION deploy');
    expect(H.rollbackConsentManagerToTarget).not.toHaveBeenCalled();
  });

  it('does not roll back on a dry run', async () => {
    await rollbackConsentManagerBundles({
      auth: 'key',
      bundleTypes: [ConsentBundleType.Production],
      version: '1.0.0',
      dryRun: true,
    });

    expect(H.fetchConsentManagerRollbackTarget).toHaveBeenCalledTimes(1);
    expect(H.rollbackConsentManagerToTarget).not.toHaveBeenCalled();
  });
});
