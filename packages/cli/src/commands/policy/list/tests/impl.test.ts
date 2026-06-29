import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { LocalContext } from '../../../../context.js';
import { list } from '../impl.js';

const buildPolicyEngineClientMock = vi.hoisted(() => vi.fn());

vi.mock('../../helpers.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../helpers.js')>();
  return {
    ...actual,
    buildPolicyEngineClient: buildPolicyEngineClientMock,
  };
});

describe('list', () => {
  const exit = vi.fn();
  const stdout = { write: vi.fn() };
  const context = {
    process: { exit, stdout },
  } as unknown as LocalContext;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DEVELOPMENT_MODE_VALIDATE_ONLY = 'false';
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

    await list.call(context, {
      auth: 'test-key',
      transcendUrl: 'https://api.transcend.io',
      limit: 50,
      offset: 0,
      json: false,
    });

    expect(get).toHaveBeenCalledWith('api/v1/policy-engine/policy-bundles', {
      searchParams: { limit: 50, offset: 0 },
    });
    expect(stdout.write).toHaveBeenCalledWith(expect.stringContaining('bundle-id'));
  });
});
