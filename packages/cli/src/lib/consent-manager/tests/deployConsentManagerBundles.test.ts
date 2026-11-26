import { ConsentBundleType } from '@transcend-io/privacy-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const H = vi.hoisted(() => ({
  client: { tag: 'client' },
  deployConsentManager: vi.fn(),
  fetchConsentManagerId: vi.fn(),
  waitForConsentManagerDeploy: vi.fn(),
  updateConsentManagerToLatest: vi.fn(),
}));

vi.mock('@transcend-io/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@transcend-io/sdk')>()),
  buildTranscendGraphQLClient: vi.fn(() => H.client),
  deployConsentManager: H.deployConsentManager,
  fetchConsentManagerId: H.fetchConsentManagerId,
  waitForConsentManagerDeploy: H.waitForConsentManagerDeploy,
  updateConsentManagerToLatest: H.updateConsentManagerToLatest,
}));

vi.mock('../../../logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { deployConsentManagerBundles } from '../deployConsentManagerBundles.js';

describe('deployConsentManagerBundles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    H.fetchConsentManagerId.mockResolvedValue('bundle-1');
    H.deployConsentManager.mockResolvedValue(undefined);
    H.waitForConsentManagerDeploy.mockResolvedValue('DEPLOYED');
  });

  it('deploys TEST before PRODUCTION by default and never updates the version', async () => {
    await deployConsentManagerBundles({ auth: 'key' });

    expect(H.deployConsentManager.mock.calls.map(([, input]) => input)).toEqual([
      { id: 'bundle-1', bundleType: ConsentBundleType.Test },
      { id: 'bundle-1', bundleType: ConsentBundleType.Production },
    ]);
    expect(H.updateConsentManagerToLatest).not.toHaveBeenCalled();
    expect(H.waitForConsentManagerDeploy).not.toHaveBeenCalled();
  });

  it('orders requested bundle types with TEST first', async () => {
    await deployConsentManagerBundles({
      auth: 'key',
      bundleTypes: [ConsentBundleType.Production, ConsentBundleType.Test],
    });

    expect(H.deployConsentManager.mock.calls.map(([, input]) => input.bundleType)).toEqual([
      ConsentBundleType.Test,
      ConsentBundleType.Production,
    ]);
  });

  it('stops on the first failure', async () => {
    H.deployConsentManager.mockRejectedValueOnce(new Error('boom'));

    await expect(deployConsentManagerBundles({ auth: 'key' })).rejects.toThrow('boom');
    expect(H.deployConsentManager).toHaveBeenCalledTimes(1);
  });

  it('aborts before deploying when the bundle ID differs', async () => {
    await expect(
      deployConsentManagerBundles({ auth: 'key', expectBundleId: 'other-bundle' }),
    ).rejects.toThrow('Consent Manager ID mismatch');
    expect(H.deployConsentManager).not.toHaveBeenCalled();
  });

  it('deploys when the bundle ID matches', async () => {
    await deployConsentManagerBundles({ auth: 'key', expectBundleId: 'bundle-1' });
    expect(H.deployConsentManager).toHaveBeenCalledTimes(2);
  });

  it('waits after each deploy and does not start PRODUCTION when TEST fails', async () => {
    H.waitForConsentManagerDeploy.mockRejectedValueOnce(new Error('deploy failed'));

    await expect(
      deployConsentManagerBundles({ auth: 'key', wait: true, waitTimeoutSeconds: 30 }),
    ).rejects.toThrow('deploy failed');

    expect(H.deployConsentManager).toHaveBeenCalledTimes(1);
    expect(H.waitForConsentManagerDeploy).toHaveBeenCalledWith(
      H.client,
      expect.objectContaining({ timeoutMs: 30000 }),
    );
  });

  it('waits once per bundle type on success', async () => {
    await deployConsentManagerBundles({ auth: 'key', wait: true });
    expect(H.waitForConsentManagerDeploy).toHaveBeenCalledTimes(2);
  });
});
