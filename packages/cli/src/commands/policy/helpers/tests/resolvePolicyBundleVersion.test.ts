import { describe, expect, it, vi } from 'vitest';

import type { GetPolicyBundleVersionResponse, PolicyBundleVersion } from '../../types.js';
import { resolvePolicyBundleVersion } from '../resolvePolicyBundleVersion.js';

const olderVersion: PolicyBundleVersion = {
  id: 'older-id',
  version: 'v1',
  sha256: 'abc',
  sizeBytes: 100,
  description: null,
  createdBy: 'test-user',
  activatedAt: null,
  deactivatedAt: null,
  createdAt: '2026-06-24T00:00:00.000Z',
  updatedAt: '2026-06-24T00:00:00.000Z',
};

const newerVersion: PolicyBundleVersion = {
  id: 'newer-id',
  version: 'v2',
  sha256: 'def',
  sizeBytes: 100,
  description: null,
  createdBy: 'test-user',
  activatedAt: null,
  deactivatedAt: null,
  createdAt: '2026-06-25T00:00:00.000Z',
  updatedAt: '2026-06-25T00:00:00.000Z',
};

function buildListClient(nodes: PolicyBundleVersion[]) {
  const get = vi.fn(
    (_url: string, options?: { searchParams?: Record<string, string | number> }) => {
      const filteredNodes =
        options?.searchParams?.['filter[version]'] !== undefined
          ? nodes.filter((entry) => entry.version === options.searchParams?.['filter[version]'])
          : nodes;

      return {
        json: vi.fn().mockResolvedValue({
          nodes: filteredNodes.slice(0, 1),
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
          },
        }),
      };
    },
  );

  return { get };
}

describe('resolvePolicyBundleVersion', () => {
  it('returns the latest version when version is omitted', async () => {
    const client = buildListClient([newerVersion, olderVersion]);

    await expect(resolvePolicyBundleVersion(client as never, 'bundle-id', {})).resolves.toEqual(
      newerVersion,
    );
    expect(client.get).toHaveBeenCalledWith('v1/policy-engine/policy-bundles/bundle-id/versions', {
      searchParams: { limit: 1 },
    });
  });

  it('returns the matching version label via the version filter', async () => {
    const client = buildListClient([olderVersion, newerVersion]);

    await expect(
      resolvePolicyBundleVersion(client as never, 'bundle-id', { version: 'v1' }),
    ).resolves.toEqual(olderVersion);
    expect(client.get).toHaveBeenCalledWith('v1/policy-engine/policy-bundles/bundle-id/versions', {
      searchParams: { limit: 1, 'filter[version]': 'v1' },
    });
  });

  it('resolves a version by UUID via the direct version endpoint', async () => {
    const versionDetail = {
      versionId: 'version-id',
      version: 'v1',
      bundleName: 'main',
      uploadedAt: '2026-06-24T00:00:00.000Z',
      activatedAt: null,
      deactivatedAt: null,
      description: null,
      sha256: 'abc',
      sizeBytes: 100,
      downloadUrl: 'https://example.com/download',
    } satisfies GetPolicyBundleVersionResponse;

    const get = vi.fn((url: string) => ({
      json: vi.fn().mockResolvedValue(
        url.startsWith('v1/policy-engine/policy-bundle-versions/')
          ? versionDetail
          : {
              id: 'bundle-id',
              bundleName: 'main',
              description: null,
              activeVersionId: null,
              lastActivatedAt: null,
              createdAt: '2026-01-01',
              updatedAt: '2026-01-01',
            },
      ),
    }));

    await expect(
      resolvePolicyBundleVersion({ get } as never, 'bundle-id', { versionId: 'version-id' }),
    ).resolves.toMatchObject({
      id: 'version-id',
      version: 'v1',
    });
    expect(get).toHaveBeenCalledWith('v1/policy-engine/policy-bundle-versions/version-id');
    expect(get).toHaveBeenCalledWith('v1/policy-engine/policy-bundles/bundle-id');
  });

  it('throws when no versions exist', async () => {
    const client = buildListClient([]);

    await expect(resolvePolicyBundleVersion(client as never, 'bundle-id', {})).rejects.toThrow(
      'No versions found for this policy bundle.',
    );
  });

  it('throws when the requested version label is missing', async () => {
    const client = buildListClient([olderVersion, newerVersion]);

    await expect(
      resolvePolicyBundleVersion(client as never, 'bundle-id', { version: 'missing' }),
    ).rejects.toThrow('Version "missing" was not found for this policy bundle.');
  });
});
