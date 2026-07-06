import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { LocalContext } from '../../../../context.js';
import { logger } from '../../../../logger.js';
import { deactivate } from '../impl.js';

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

const sampleVersion = {
  id: 'version-id',
  version: 'abc123',
  sha256: 'deadbeef',
  sizeBytes: 100,
  description: null,
  createdBy: 'test-user',
  activatedAt: '2026-06-25T00:00:00.000Z',
  deactivatedAt: '2026-07-06T00:00:00.000Z',
  createdAt: '2026-06-25T00:00:00.000Z',
  updatedAt: '2026-07-06T00:00:00.000Z',
};

const sampleBundle = {
  id: 'bundle-id',
  bundleName: 'main',
  description: null,
  activeVersionId: null,
  lastActivatedAt: '2026-06-25T00:00:00.000Z',
  createdAt: '2026-06-25T00:00:00.000Z',
  updatedAt: '2026-07-06T00:00:00.000Z',
};

describe('deactivate', () => {
  const exit = vi.fn();
  const stdout = { write: vi.fn() };
  const context = {
    process: { exit, stdout },
  } as unknown as LocalContext;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(logger, 'info').mockImplementation(() => undefined);
  });

  it('resolves the bundle name to a UUID and POSTs the deactivate endpoint', async () => {
    const post = vi.fn().mockReturnValue({
      json: vi.fn().mockResolvedValue({ bundle: sampleBundle, version: sampleVersion }),
    });
    buildPolicyEngineClientMock.mockReturnValue({ post });
    resolveBundleIdByNameMock.mockResolvedValue('resolved-bundle-id');

    await deactivate.call(context, {
      'bundle-name': 'main',
      auth: 'test-key',
      'transcend-url': 'https://api.transcend.io',
      json: false,
    });

    expect(resolveBundleIdByNameMock).toHaveBeenCalledWith(expect.anything(), 'main');
    expect(post).toHaveBeenCalledWith(
      'v1/policy-engine/policy-bundles/resolved-bundle-id/deactivate',
    );
    expect(stdout.write).toHaveBeenCalledWith(expect.stringContaining('bundleName  main'));
    expect(stdout.write).toHaveBeenCalledWith(
      expect.stringContaining(`id          ${sampleVersion.id}`),
    );
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Policy bundle version deactivated.'),
    );
  });

  it('prints raw JSON when --json is set', async () => {
    const post = vi.fn().mockReturnValue({
      json: vi.fn().mockResolvedValue({ bundle: sampleBundle, version: sampleVersion }),
    });
    buildPolicyEngineClientMock.mockReturnValue({ post });
    resolveBundleIdByNameMock.mockResolvedValue('resolved-bundle-id');

    await deactivate.call(context, {
      'bundle-name': 'main',
      auth: 'test-key',
      'transcend-url': 'https://api.transcend.io',
      json: true,
    });

    expect(stdout.write).toHaveBeenCalledWith(expect.stringContaining('"bundleName": "main"'));
  });

  it('throws a CLI-side error when the bundle name is unknown (before calling the monolith)', async () => {
    const post = vi.fn();
    buildPolicyEngineClientMock.mockReturnValue({ post });
    resolveBundleIdByNameMock.mockResolvedValue(undefined);

    await expect(
      deactivate.call(context, {
        'bundle-name': 'missing',
        auth: 'test-key',
        'transcend-url': 'https://api.transcend.io',
        json: false,
      }),
    ).rejects.toThrow('Policy bundle "missing" was not found for this organization.');

    expect(post).not.toHaveBeenCalled();
  });

  it('rewrites a 409 (no active version) to reference the user-supplied bundle name', async () => {
    const httpError = {
      response: {
        statusCode: 409,
        body: JSON.stringify({
          message: 'Policy bundle "resolved-bundle-id" has no active version.',
        }),
      },
    };
    const post = vi.fn().mockReturnValue({
      json: vi.fn().mockRejectedValue(httpError),
    });
    buildPolicyEngineClientMock.mockReturnValue({ post });
    resolveBundleIdByNameMock.mockResolvedValue('resolved-bundle-id');

    await expect(
      deactivate.call(context, {
        'bundle-name': 'main',
        auth: 'test-key',
        'transcend-url': 'https://api.transcend.io',
        json: false,
      }),
    ).rejects.toThrow('Policy bundle "main" has no active version.');
  });

  it('surfaces a non-409 monolith error via the shared error formatter', async () => {
    const httpError = {
      response: {
        statusCode: 401,
        body: JSON.stringify({ message: 'Missing required scope.' }),
      },
    };
    const post = vi.fn().mockReturnValue({
      json: vi.fn().mockRejectedValue(httpError),
    });
    buildPolicyEngineClientMock.mockReturnValue({ post });
    resolveBundleIdByNameMock.mockResolvedValue('resolved-bundle-id');

    await expect(
      deactivate.call(context, {
        'bundle-name': 'main',
        auth: 'test-key',
        'transcend-url': 'https://api.transcend.io',
        json: false,
      }),
    ).rejects.toThrow('Missing required scope.');
  });
});
