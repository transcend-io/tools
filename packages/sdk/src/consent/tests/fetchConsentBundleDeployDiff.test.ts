import { ConsentBundleType } from '@transcend-io/privacy-types';
import type { GraphQLClient } from 'graphql-request';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const makeGraphQLRequest = vi.fn();

vi.mock('../../api/makeGraphQLRequest.js', () => ({
  makeGraphQLRequest: (...args: unknown[]) => makeGraphQLRequest(...args),
}));

const fetchDeployedCompanionModules = vi.fn();

vi.mock('../bundleDeployPreview/bundleDeployFetchHelpers.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../bundleDeployPreview/bundleDeployFetchHelpers.js')>();
  return {
    ...actual,
    fetchDeployedCompanionModules: (...args: unknown[]) => fetchDeployedCompanionModules(...args),
  };
});

import { fetchConsentBundleDeployDiff } from '../bundleDeployPreview/fetchConsentBundleDeployDiff.js';

const client = {} as GraphQLClient;

describe('fetchConsentBundleDeployDiff', () => {
  beforeEach(() => {
    makeGraphQLRequest.mockReset();
    fetchDeployedCompanionModules.mockReset();
    fetchDeployedCompanionModules.mockResolvedValue({ messages: { en: { title: 'Old' } } });
  });

  it('loads production pending config and deployed snapshot', async () => {
    makeGraphQLRequest
      .mockResolvedValueOnce({
        consentManagerConfigurationJson: {
          consentManagerConfigurationJson: {
            id: 'bundle-1',
            configurationJson: '{"core":{"v":2}}',
            testConfigurationJson: '{"core":{"v":0}}',
            useIabFramework: true,
          },
        },
      })
      .mockResolvedValueOnce({
        airgapBundleVersions: {
          nodes: [{ coreConfig: '{"version":"v1"}', createdAt: '2024-06-01T00:00:00.000Z' }],
        },
      })
      .mockResolvedValueOnce({
        consentManager: {
          consentManager: {
            bundleURL: 'https://transcend-cdn.com/cm/airgap.js',
            testBundleURL: 'https://transcend-cdn.com/cm-test/airgap.js',
          },
        },
      });

    const result = await fetchConsentBundleDeployDiff(client, {
      airgapBundleId: 'bundle-1',
      bundleType: ConsentBundleType.Production,
    });

    expect(result.pending.core).toEqual({ v: 2 });
    expect(result.deployedCore).toEqual({ version: 'v1' });
    expect(result.firstDeploy).toBe(false);
    expect(result.useIabFramework).toBe(true);
    expect(fetchDeployedCompanionModules).toHaveBeenCalledWith(
      { version: 'v1' },
      'https://transcend-cdn.com',
    );
  });

  it('uses test configuration and marks first deploy when no coreConfig exists', async () => {
    makeGraphQLRequest
      .mockResolvedValueOnce({
        consentManagerConfigurationJson: {
          consentManagerConfigurationJson: {
            id: 'bundle-1',
            configurationJson: '{}',
            testConfigurationJson: '{"core":{"v":1}}',
            useIabFramework: false,
          },
        },
      })
      .mockResolvedValueOnce({
        airgapBundleVersions: { nodes: [{ coreConfig: null, createdAt: null }] },
      })
      .mockResolvedValueOnce({
        consentManager: {
          consentManager: {
            bundleURL: 'https://transcend-cdn.com/cm/airgap.js',
            testBundleURL: 'https://transcend-cdn.com/cm-test/airgap.js',
          },
        },
      });

    const result = await fetchConsentBundleDeployDiff(client, {
      airgapBundleId: 'bundle-1',
      bundleType: ConsentBundleType.Test,
    });

    expect(result.pending.core).toEqual({ v: 1 });
    expect(result.deployedCore).toBeNull();
    expect(result.firstDeploy).toBe(true);
    expect(fetchDeployedCompanionModules).not.toHaveBeenCalled();
  });
});
