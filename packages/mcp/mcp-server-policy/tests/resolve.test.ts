import { describe, expect, it, vi } from 'vitest';

import { ErrorCode } from '@transcend-io/mcp-server-base';

import {
  getPolicyBundleById,
  getPolicyBundleVersion,
  listPolicyBundles,
  resolvePolicyBundle,
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
      json: vi.fn().mockResolvedValue({
        bundle: sampleBundle,
      }),
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

  it('resolvePolicyBundle resolves by id', async () => {
    const get = vi.fn().mockReturnValue({
      json: vi.fn().mockResolvedValue({
        bundle: sampleBundle,
      }),
    });

    await expect(
      resolvePolicyBundle({ get } as never, { bundleId: 'bundle-id' }),
    ).resolves.toEqual(sampleBundle);
  });

  it('resolvePolicyBundle resolves by name', async () => {
    const get = vi.fn().mockReturnValue({
      json: vi.fn().mockResolvedValue({
        nodes: [sampleBundle],
        totalCount: 1,
      }),
    });

    await expect(
      resolvePolicyBundle({ get } as never, { bundleName: 'main' }),
    ).resolves.toEqual(sampleBundle);
  });

  it('resolvePolicyBundle throws non-retryable NOT_FOUND when missing', async () => {
    const get = vi.fn().mockReturnValue({
      json: vi.fn().mockResolvedValue({
        nodes: [],
        totalCount: 0,
      }),
    });

    await expect(
      resolvePolicyBundle({ get } as never, { bundleName: 'missing' }),
    ).rejects.toMatchObject({
      name: 'ToolError',
      code: ErrorCode.NOT_FOUND,
      retryable: false,
      message: 'Policy bundle "missing" was not found.',
    });
  });

  it('resolvePolicyBundle throws non-retryable VALIDATION_ERROR without id or name', async () => {
    await expect(resolvePolicyBundle({ get: vi.fn() } as never, {})).rejects.toMatchObject({
      name: 'ToolError',
      code: ErrorCode.VALIDATION_ERROR,
      retryable: false,
      message: 'Provide bundleId or bundleName.',
    });
  });

  it('getPolicyBundleVersion uses the nested bundle version endpoint', async () => {
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

    await expect(
      getPolicyBundleVersion({ get } as never, 'bundle-id', 'version-id'),
    ).resolves.toEqual(detail);
    expect(get).toHaveBeenCalledWith(
      'v1/policy-engine/policy-bundles/bundle-id/versions/version-id',
    );
  });
});
