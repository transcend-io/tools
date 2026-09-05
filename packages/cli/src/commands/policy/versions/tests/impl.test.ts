import { describe, expect, it, vi, beforeEach } from 'vitest';

import { buildContextForTest } from '../../../../lib/tests/helpers/buildContextForTest.js';
import { versions } from '../impl.js';

const buildPolicyEngineClientMock = vi.hoisted(() => vi.fn());
const resolveBundleIdByNameMock = vi.hoisted(() => vi.fn());

vi.mock('../../helpers/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../helpers/index.js')>();
  return {
    ...actual,
    buildPolicyEngineClient: buildPolicyEngineClientMock,
    resolveBundleIdByName: resolveBundleIdByNameMock,
  };
});

describe('versions', () => {
  const context = buildContextForTest({
    env: { DEVELOPMENT_MODE_VALIDATE_ONLY: 'false' },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    context.reset();
    resolveBundleIdByNameMock.mockResolvedValue('resolved-bundle-id');
  });

  it('lists versions and appends the next cursor when more pages exist', async () => {
    const get = vi.fn().mockReturnValue({
      json: vi.fn().mockResolvedValue({
        nodes: [
          {
            id: 'version-id',
            version: 'abc123',
            createdAt: '2026-06-25T00:00:00.000Z',
            activatedAt: null,
            deactivatedAt: null,
          },
        ],
        pageInfo: { hasNextPage: true, hasPreviousPage: false, endCursor: 'cursor-0' },
      }),
    });
    buildPolicyEngineClientMock.mockReturnValue({ get });

    await versions.call(context, {
      'bundle-name': 'main',
      auth: 'test-key',
      'transcend-url': 'https://api.transcend.io',
      limit: 50,
      json: false,
    });

    expect(get).toHaveBeenCalledWith(
      'v1/policy-engine/policy-bundles/resolved-bundle-id/versions',
      {
        searchParams: { limit: 50 },
      },
    );
    expect(context.stdout).toContain('abc123');
    expect(context.stdout).toContain('after: cursor-0');
  });

  it('forwards the --after cursor as a search param', async () => {
    const get = vi.fn().mockReturnValue({
      json: vi.fn().mockResolvedValue({
        nodes: [],
        pageInfo: { hasNextPage: false, hasPreviousPage: true, endCursor: undefined },
      }),
    });
    buildPolicyEngineClientMock.mockReturnValue({ get });

    await versions.call(context, {
      'bundle-name': 'main',
      auth: 'test-key',
      'transcend-url': 'https://api.transcend.io',
      limit: 50,
      after: 'cursor-0',
      json: false,
    });

    expect(get).toHaveBeenCalledWith(
      'v1/policy-engine/policy-bundles/resolved-bundle-id/versions',
      {
        searchParams: { limit: 50, after: 'cursor-0' },
      },
    );
  });

  it('prints "No more versions" when paginating past the end with --after', async () => {
    const get = vi.fn().mockReturnValue({
      json: vi.fn().mockResolvedValue({
        nodes: [],
        pageInfo: { hasNextPage: false, hasPreviousPage: true, endCursor: undefined },
      }),
    });
    buildPolicyEngineClientMock.mockReturnValue({ get });

    await versions.call(context, {
      'bundle-name': 'main',
      auth: 'test-key',
      'transcend-url': 'https://api.transcend.io',
      limit: 50,
      after: 'cursor-0',
      json: false,
    });

    expect(context.stdout).toContain('No more versions for bundle "main" (end of results).');
  });

  it('prints "No versions found" when the first page is empty without --after', async () => {
    const get = vi.fn().mockReturnValue({
      json: vi.fn().mockResolvedValue({
        nodes: [],
        pageInfo: { hasNextPage: false, hasPreviousPage: false, endCursor: undefined },
      }),
    });
    buildPolicyEngineClientMock.mockReturnValue({ get });

    await versions.call(context, {
      'bundle-name': 'main',
      auth: 'test-key',
      'transcend-url': 'https://api.transcend.io',
      limit: 50,
      json: false,
    });

    expect(context.stdout).toContain('No versions found for bundle "main".');
  });

  it('throws a CLI-side error when the bundle name is unknown', async () => {
    const get = vi.fn();
    buildPolicyEngineClientMock.mockReturnValue({ get });
    resolveBundleIdByNameMock.mockResolvedValue(undefined);

    await expect(
      versions.call(context, {
        'bundle-name': 'missing',
        auth: 'test-key',
        'transcend-url': 'https://api.transcend.io',
        limit: 50,
        json: false,
      }),
    ).rejects.toThrow('Policy bundle "missing" was not found for this organization.');

    expect(get).not.toHaveBeenCalled();
  });

  it('surfaces auth failures with a user-readable message', async () => {
    const httpError = {
      response: {
        statusCode: 401,
        body: JSON.stringify({ message: 'Unauthorized' }),
      },
    };
    const get = vi.fn().mockReturnValue({
      json: vi.fn().mockRejectedValue(httpError),
    });
    buildPolicyEngineClientMock.mockReturnValue({ get });

    await expect(
      versions.call(context, {
        'bundle-name': 'main',
        auth: 'test-key',
        'transcend-url': 'https://api.transcend.io',
        limit: 50,
        json: false,
      }),
    ).rejects.toThrow(/Authentication failed \(401 Unauthorized\)/);
  });
});
