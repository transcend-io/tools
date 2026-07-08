import { describe, expect, it, vi } from 'vitest';

import type { PolicyBundleVersion } from '../../types.js';
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

function buildClient(pages: PolicyBundleVersion[][]) {
  const get = vi.fn((_url: string, options?: { searchParams?: { after?: string } }) => {
    const pageIndex = options?.searchParams?.after ? 1 : 0;
    const nodes = pages[pageIndex] ?? [];
    const hasNextPage = pageIndex < pages.length - 1;

    return {
      json: vi.fn().mockResolvedValue({
        nodes,
        pageInfo: {
          hasNextPage,
          hasPreviousPage: pageIndex > 0,
          endCursor: hasNextPage ? `cursor-${pageIndex}` : undefined,
        },
      }),
    };
  });

  return { get };
}

describe('resolvePolicyBundleVersion', () => {
  it('returns the latest version by createdAt when version is omitted', async () => {
    const client = buildClient([[olderVersion, newerVersion]]);

    await expect(resolvePolicyBundleVersion(client as never, 'bundle-id', {})).resolves.toEqual(
      newerVersion,
    );
  });

  it('returns the matching version label', async () => {
    const client = buildClient([[olderVersion, newerVersion]]);

    await expect(
      resolvePolicyBundleVersion(client as never, 'bundle-id', { version: 'v1' }),
    ).resolves.toEqual(olderVersion);
  });

  it('follows pagination when resolving the latest version', async () => {
    const client = buildClient([[olderVersion], [newerVersion]]);

    await expect(resolvePolicyBundleVersion(client as never, 'bundle-id', {})).resolves.toEqual(
      newerVersion,
    );
    expect(client.get).toHaveBeenCalledTimes(2);
  });

  it('throws when no versions exist', async () => {
    const client = buildClient([[]]);

    await expect(resolvePolicyBundleVersion(client as never, 'bundle-id', {})).rejects.toThrow(
      'No versions found for this policy bundle.',
    );
  });

  it('throws when the requested version label is missing', async () => {
    const client = buildClient([[olderVersion, newerVersion]]);

    await expect(
      resolvePolicyBundleVersion(client as never, 'bundle-id', { version: 'missing' }),
    ).rejects.toThrow('Version "missing" was not found for this policy bundle.');
  });
});
