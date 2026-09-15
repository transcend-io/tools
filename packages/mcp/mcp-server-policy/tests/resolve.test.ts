import { describe, expect, it, vi } from 'vitest';

import { getPolicyBundleVersion } from '../src/helpers/policyCliOperations.js';
import { resolveBundleById, resolveBundleByName } from '../src/helpers/resolveBundle.js';
import { resolvePolicyBundleVersion } from '../src/helpers/resolvePolicyBundleVersion.js';
import type { GetPolicyBundleVersionResponse, PolicyBundle } from '../src/helpers/types.js';

const sampleBundle: PolicyBundle = {
  id: 'bundle-id',
  bundleName: 'main',
  description: null,
  activeVersionId: 'active-version-id',
  lastActivatedAt: '2026-01-02',
  createdAt: '2026-01-02',
  updatedAt: '2026-01-02',
};

describe('policy resolve helpers', () => {
  it('resolveBundleByName uses the bundleName list filter', async () => {
    const get = vi.fn().mockReturnValue({
      json: vi.fn().mockResolvedValue({
        nodes: [sampleBundle],
        totalCount: 1,
      }),
    });

    await expect(resolveBundleByName({ get } as never, 'main')).resolves.toEqual(sampleBundle);
    expect(get).toHaveBeenCalledWith('v1/policy-engine/policy-bundles', {
      searchParams: { 'filter[bundleName]': 'main', limit: 1, offset: 0 },
    });
  });

  it('resolveBundleById fetches the bundle directly by UUID', async () => {
    const get = vi.fn().mockReturnValue({
      json: vi.fn().mockResolvedValue(sampleBundle),
    });

    await expect(resolveBundleById({ get } as never, 'bundle-id')).resolves.toEqual(sampleBundle);
    expect(get).toHaveBeenCalledWith('v1/policy-engine/policy-bundles/bundle-id');
  });

  it('resolveBundleById returns undefined on 404', async () => {
    const get = vi.fn().mockReturnValue({
      json: vi.fn().mockRejectedValue({ response: { statusCode: 404 } }),
    });

    await expect(resolveBundleById({ get } as never, 'missing-id')).resolves.toBeUndefined();
  });

  it('resolvePolicyBundleVersion resolves a version label via the version filter', async () => {
    const version = {
      id: 'version-id',
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

    const get = vi.fn().mockReturnValue({
      json: vi.fn().mockResolvedValue({
        nodes: [version],
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      }),
    });

    await expect(
      resolvePolicyBundleVersion({ get } as never, 'bundle-id', { version: 'v1' }),
    ).resolves.toEqual(version);
    expect(get).toHaveBeenCalledWith('v1/policy-engine/policy-bundles/bundle-id/versions', {
      searchParams: { limit: 1, 'filter[version]': 'v1' },
    });
  });

  it('getPolicyBundleVersion uses the direct version endpoint', async () => {
    const detail = {
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

    const get = vi.fn().mockReturnValue({
      json: vi.fn().mockResolvedValue(detail),
    });

    await expect(getPolicyBundleVersion({ get } as never, 'version-id')).resolves.toEqual(detail);
    expect(get).toHaveBeenCalledWith('v1/policy-engine/policy-bundle-versions/version-id');
  });
});
