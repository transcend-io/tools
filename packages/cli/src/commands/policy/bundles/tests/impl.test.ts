import { describe, expect, it, vi, beforeEach } from 'vitest';

import { buildContextForTest } from '../../../../lib/tests/helpers/buildContextForTest.js';
import { bundles } from '../impl.js';

const buildPolicyEngineClientMock = vi.hoisted(() => vi.fn());

vi.mock('../../helpers/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../helpers/index.js')>();
  return {
    ...actual,
    buildPolicyEngineClient: buildPolicyEngineClientMock,
  };
});

describe('bundles', () => {
  const context = buildContextForTest({
    env: { DEVELOPMENT_MODE_VALIDATE_ONLY: 'false' },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    context.reset();
  });

  it('fetches bundles and renders a table by default', async () => {
    const get = vi.fn().mockReturnValue({
      json: vi.fn().mockResolvedValue({
        nodes: [
          {
            id: 'bundle-id',
            bundleName: 'main',
            description: null,
            activeVersionId: 'version-id',
            lastActivatedAt: '2026-06-25T00:00:00.000Z',
            createdAt: '2026-06-24T00:00:00.000Z',
            updatedAt: '2026-06-25T00:00:00.000Z',
          },
        ],
        totalCount: 1,
      }),
    });
    buildPolicyEngineClientMock.mockReturnValue({ get });

    await bundles.call(context, {
      auth: 'test-key',
      'transcend-url': 'https://api.transcend.io',
      limit: 50,
      offset: 0,
      json: false,
    });

    expect(get).toHaveBeenCalledWith('v1/policy-engine/policy-bundles', {
      searchParams: { limit: 50, offset: 0 },
    });
    expect(context.stdout).toContain('bundle-id');
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
      bundles.call(context, {
        auth: 'invalid-key',
        'transcend-url': 'https://api.transcend.io',
        limit: 50,
        offset: 0,
        json: false,
      }),
    ).rejects.toThrow(/Authentication failed \(401 Unauthorized\)/);
  });
});
