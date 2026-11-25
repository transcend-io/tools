import { ConsentBundleType } from '@transcend-io/privacy-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const H = vi.hoisted(() => ({
  client: { tag: 'client' },
  fetchConsentManagerId: vi.fn(),
  fetchConsentBundleDeployDiff: vi.fn(),
  diffConsentBundleDeploy: vi.fn(),
  summarizeConsentBundleDeployDiff: vi.fn(),
}));

vi.mock('@transcend-io/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@transcend-io/sdk')>()),
  buildTranscendGraphQLClient: vi.fn(() => H.client),
  fetchConsentManagerId: H.fetchConsentManagerId,
  fetchConsentBundleDeployDiff: H.fetchConsentBundleDeployDiff,
  diffConsentBundleDeploy: H.diffConsentBundleDeploy,
  summarizeConsentBundleDeployDiff: H.summarizeConsentBundleDeployDiff,
}));

import { previewConsentManagerDeploy } from '../previewConsentManagerDeploy.js';

describe('previewConsentManagerDeploy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    H.fetchConsentManagerId.mockResolvedValue('bundle-1');
    H.fetchConsentBundleDeployDiff.mockResolvedValue({ inputs: true });
    H.summarizeConsentBundleDeployDiff.mockReturnValue('summary');
  });

  it('returns one preview per bundle type, TEST first', async () => {
    H.diffConsentBundleDeploy.mockReturnValue({
      firstDeploy: false,
      hasChanges: true,
      lastDeployedAt: null,
      modules: [],
    });

    const results = await previewConsentManagerDeploy({
      auth: 'key',
      bundleTypes: [ConsentBundleType.Production, ConsentBundleType.Test],
    });

    expect(results.map((r) => r.bundleType)).toEqual([
      ConsentBundleType.Test,
      ConsentBundleType.Production,
    ]);
    expect(results.every((r) => r.hasChanges && r.summary === 'summary')).toBe(true);
    expect(H.fetchConsentBundleDeployDiff).toHaveBeenCalledWith(H.client, {
      airgapBundleId: 'bundle-1',
      bundleType: ConsentBundleType.Test,
    });
  });

  it('reports no changes when nothing is pending', async () => {
    H.diffConsentBundleDeploy.mockReturnValue({
      firstDeploy: false,
      hasChanges: false,
      lastDeployedAt: null,
      modules: [],
    });

    const [result] = await previewConsentManagerDeploy({
      auth: 'key',
      bundleTypes: [ConsentBundleType.Production],
    });

    expect(result.hasChanges).toBe(false);
  });

  it('counts a first deploy as a change', async () => {
    H.diffConsentBundleDeploy.mockReturnValue({
      firstDeploy: true,
      hasChanges: false,
      lastDeployedAt: null,
      modules: [],
    });

    const [result] = await previewConsentManagerDeploy({
      auth: 'key',
      bundleTypes: [ConsentBundleType.Test],
    });

    expect(result.hasChanges).toBe(true);
  });
});
