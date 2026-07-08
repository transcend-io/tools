import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { LocalContext } from '../../../../context.js';
import { logger } from '../../../../logger.js';
import { activate } from '../impl.js';

const buildPolicyEngineClientMock = vi.hoisted(() => vi.fn());
const resolveBundleIdByNameMock = vi.hoisted(() => vi.fn());
const resolvePolicyBundleVersionMock = vi.hoisted(() => vi.fn());

vi.mock('../../helpers/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../helpers/index.js')>();
  return {
    ...actual,
    buildPolicyEngineClient: buildPolicyEngineClientMock,
    resolveBundleIdByName: resolveBundleIdByNameMock,
    resolvePolicyBundleVersion: resolvePolicyBundleVersionMock,
  };
});

const sampleVersion = {
  id: 'version-id',
  version: 'abc123',
  sha256: 'deadbeef',
  sizeBytes: 100,
  description: null,
  createdBy: 'test-user',
  activatedAt: null,
  deactivatedAt: null,
  createdAt: '2026-06-25T00:00:00.000Z',
  updatedAt: '2026-06-25T00:00:00.000Z',
};

const sampleBundle = {
  id: 'bundle-id',
  bundleName: 'main',
  description: null,
  activeVersionId: 'version-id',
  lastActivatedAt: '2026-06-25T00:00:00.000Z',
  createdAt: '2026-06-25T00:00:00.000Z',
  updatedAt: '2026-06-25T00:00:00.000Z',
};

describe('activate', () => {
  const exit = vi.fn();
  const stdout = { write: vi.fn() };
  const context = {
    process: { exit, stdout },
  } as unknown as LocalContext;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(logger, 'info').mockImplementation(() => undefined);
    process.env.DEVELOPMENT_MODE_VALIDATE_ONLY = 'false';
  });

  it('resolves the bundle name and version label, then POSTs the activate endpoint', async () => {
    const post = vi.fn().mockReturnValue({
      json: vi.fn().mockResolvedValue({ bundle: sampleBundle, version: sampleVersion }),
    });
    buildPolicyEngineClientMock.mockReturnValue({ post });
    resolveBundleIdByNameMock.mockResolvedValue('resolved-bundle-id');
    resolvePolicyBundleVersionMock.mockResolvedValue(sampleVersion);

    await activate.call(context, {
      'bundle-name': 'main',
      version: 'abc123',
      auth: 'test-key',
      'transcend-url': 'https://api.transcend.io',
      'dry-run': false,
      json: false,
    });

    expect(resolveBundleIdByNameMock).toHaveBeenCalledWith(expect.anything(), 'main');
    expect(resolvePolicyBundleVersionMock).toHaveBeenCalledWith(
      expect.anything(),
      'resolved-bundle-id',
      { version: 'abc123' },
    );
    expect(post).toHaveBeenCalledWith(
      'v1/policy-engine/policy-bundles/resolved-bundle-id/versions/version-id/activate',
      { json: {} },
    );
    expect(stdout.write).toHaveBeenCalledWith(expect.stringContaining('bundleName  main'));
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Policy bundle version activated.'),
    );
  });

  it('activates the latest version when --version is omitted', async () => {
    const post = vi.fn().mockReturnValue({
      json: vi.fn().mockResolvedValue({ bundle: sampleBundle, version: sampleVersion }),
    });
    buildPolicyEngineClientMock.mockReturnValue({ post });
    resolveBundleIdByNameMock.mockResolvedValue('resolved-bundle-id');
    resolvePolicyBundleVersionMock.mockResolvedValue(sampleVersion);

    await activate.call(context, {
      'bundle-name': 'main',
      auth: 'test-key',
      'transcend-url': 'https://api.transcend.io',
      'dry-run': false,
      json: false,
    });

    expect(resolvePolicyBundleVersionMock).toHaveBeenCalledWith(
      expect.anything(),
      'resolved-bundle-id',
      { version: undefined },
    );
    expect(post).toHaveBeenCalled();
  });

  it('prints raw JSON when --json is set', async () => {
    const post = vi.fn().mockReturnValue({
      json: vi.fn().mockResolvedValue({ bundle: sampleBundle, version: sampleVersion }),
    });
    buildPolicyEngineClientMock.mockReturnValue({ post });
    resolveBundleIdByNameMock.mockResolvedValue('resolved-bundle-id');
    resolvePolicyBundleVersionMock.mockResolvedValue(sampleVersion);

    await activate.call(context, {
      'bundle-name': 'main',
      version: 'abc123',
      auth: 'test-key',
      'transcend-url': 'https://api.transcend.io',
      'dry-run': false,
      json: true,
    });

    expect(stdout.write).toHaveBeenCalledWith(expect.stringContaining('"bundleName": "main"'));
  });

  it('throws a CLI-side error when the bundle name is unknown (before calling the monolith)', async () => {
    const post = vi.fn();
    buildPolicyEngineClientMock.mockReturnValue({ post });
    resolveBundleIdByNameMock.mockResolvedValue(undefined);

    await expect(
      activate.call(context, {
        'bundle-name': 'missing',
        auth: 'test-key',
        'transcend-url': 'https://api.transcend.io',
        'dry-run': false,
        json: false,
      }),
    ).rejects.toThrow('Policy bundle "missing" was not found for this organization.');

    expect(post).not.toHaveBeenCalled();
    expect(resolvePolicyBundleVersionMock).not.toHaveBeenCalled();
  });

  it('sends dryRun in the request body when --dry-run is set', async () => {
    const post = vi.fn().mockReturnValue({
      json: vi.fn().mockResolvedValue({ bundle: sampleBundle, version: sampleVersion }),
    });
    buildPolicyEngineClientMock.mockReturnValue({ post });
    resolveBundleIdByNameMock.mockResolvedValue('resolved-bundle-id');
    resolvePolicyBundleVersionMock.mockResolvedValue(sampleVersion);

    await activate.call(context, {
      'bundle-name': 'main',
      version: 'abc123',
      auth: 'test-key',
      'transcend-url': 'https://api.transcend.io',
      'dry-run': true,
      json: false,
    });

    expect(post).toHaveBeenCalledWith(
      'v1/policy-engine/policy-bundles/resolved-bundle-id/versions/version-id/activate',
      { json: { dryRun: true } },
    );
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Activation validation succeeded.'),
    );
  });
});
