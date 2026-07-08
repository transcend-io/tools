import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  assertOpaInstalled,
  buildPolicyEngineClient,
  defaultPolicyVersionLabel,
  printResult,
  renderTable,
  resolveBundleIdByName,
} from '../helpers/index.js';
import type { PolicyBundleListResponse } from '../types.js';

const spawnSyncMock = vi.hoisted(() => vi.fn());
const gotExtendMock = vi.hoisted(() => vi.fn());

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return {
    ...actual,
    spawnSync: spawnSyncMock,
    spawn: vi.fn(),
  };
});

vi.mock('got', () => ({
  default: {
    extend: gotExtendMock,
  },
}));

describe('policy helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('assertOpaInstalled throws when opa is missing', () => {
    spawnSyncMock.mockReturnValue({ status: 1 });

    expect(() => assertOpaInstalled()).toThrow(/opa/i);
  });

  it('assertOpaInstalled succeeds when opa is available', () => {
    spawnSyncMock.mockReturnValue({ status: 0 });

    expect(() => assertOpaInstalled()).not.toThrow();
  });

  it('defaultPolicyVersionLabel uses bundle name and UTC timestamp', () => {
    expect(defaultPolicyVersionLabel('main', new Date('2026-07-02T16:08:30.000Z'))).toBe(
      'main-2026-07-02-16-08-30',
    );
  });

  it('resolveBundleIdByName paginates with offset until a bundle name matches', async () => {
    const get = vi
      .fn()
      .mockReturnValueOnce({
        json: vi.fn().mockResolvedValue({
          nodes: [
            {
              id: 'other-id',
              bundleName: 'common',
              description: null,
              activeVersionId: null,
              lastActivatedAt: null,
              createdAt: '2026-01-01',
              updatedAt: '2026-01-01',
            },
          ],
          totalCount: 2,
        } satisfies PolicyBundleListResponse),
      })
      .mockReturnValueOnce({
        json: vi.fn().mockResolvedValue({
          nodes: [
            {
              id: 'main-id',
              bundleName: 'main',
              description: null,
              activeVersionId: null,
              lastActivatedAt: null,
              createdAt: '2026-01-02',
              updatedAt: '2026-01-02',
            },
          ],
          totalCount: 2,
        } satisfies PolicyBundleListResponse),
      });

    gotExtendMock.mockReturnValue({ get });
    const client = buildPolicyEngineClient('https://api.transcend.io', 'test-key');

    await expect(resolveBundleIdByName(client, 'main')).resolves.toBe('main-id');
    expect(get).toHaveBeenNthCalledWith(1, 'v1/policy-engine/policy-bundles', {
      searchParams: { limit: 100, offset: 0 },
    });
    expect(get).toHaveBeenNthCalledWith(2, 'v1/policy-engine/policy-bundles', {
      searchParams: { limit: 100, offset: 1 },
    });
  });

  it('renderTable formats aligned columns', () => {
    const table = renderTable(
      ['id', 'name'],
      [
        ['1', 'main'],
        ['2', 'common'],
      ],
    );

    expect(table).toContain('id');
    expect(table).toContain('main');
    expect(table.split('\n')).toHaveLength(4);
  });

  it('printResult writes JSON when json=true', () => {
    const stdout = { write: vi.fn() };
    printResult(stdout as unknown as NodeJS.WriteStream, {
      json: true,
      data: { ok: true },
    });

    expect(stdout.write).toHaveBeenCalledWith(`${JSON.stringify({ ok: true }, null, 2)}\n`);
  });
});
