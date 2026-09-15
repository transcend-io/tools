import { describe, expect, it, vi } from 'vitest';

import {
  getPolicyBundleById,
  getPolicyBundleVersion,
  listPolicyBundles,
} from '../src/helpers/policyCliOperations.js';
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

describe('policyCliOperations', () => {
  it('listPolicyBundles uses the bundleName list filter', async () => {
    const get = vi.fn().mockReturnValue({
      json: vi.fn().mockResolvedValue({
        nodes: [sampleBundle],
        totalCount: 1,
      }),
    });

    await expect(
      listPolicyBundles({ get } as never, { bundleName: 'main', limit: 1 }),
    ).resolves.toEqual({
      nodes: [sampleBundle],
      totalCount: 1,
    });
    expect(get).toHaveBeenCalledWith('v1/policy-engine/policy-bundles', {
      searchParams: { 'filter[bundleName]': 'main', limit: 1, offset: 0 },
    });
  });

  it('getPolicyBundleById fetches the bundle directly by UUID', async () => {
    const get = vi.fn().mockReturnValue({
      json: vi.fn().mockResolvedValue(sampleBundle),
    });

    await expect(getPolicyBundleById({ get } as never, 'bundle-id')).resolves.toEqual(sampleBundle);
    expect(get).toHaveBeenCalledWith('v1/policy-engine/policy-bundles/bundle-id');
  });

  it('getPolicyBundleById returns undefined on 404', async () => {
    const get = vi.fn().mockReturnValue({
      json: vi.fn().mockRejectedValue({ response: { statusCode: 404 } }),
    });

    await expect(getPolicyBundleById({ get } as never, 'missing-id')).resolves.toBeUndefined();
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
