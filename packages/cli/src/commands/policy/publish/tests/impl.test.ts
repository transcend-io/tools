import fs from 'node:fs';

import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { LocalContext } from '../../../../context.js';
import { publish } from '../impl.js';

const buildOpaBundleTarballMock = vi.hoisted(() => vi.fn());
const buildPolicyEngineClientMock = vi.hoisted(() => vi.fn());
const resolveBundleIdByNameMock = vi.hoisted(() => vi.fn());

vi.mock('../../_helpers.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../_helpers.js')>();
  return {
    ...actual,
    buildOpaBundleTarball: buildOpaBundleTarballMock,
    buildPolicyEngineClient: buildPolicyEngineClientMock,
    resolveBundleIdByName: resolveBundleIdByNameMock,
    buildPolicyBundleFormData: vi.fn(() => new FormData()),
    defaultPolicyVersionLabel: vi.fn(() => 'abc123'),
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

describe('publish', () => {
  const exit = vi.fn();
  const stdout = { write: vi.fn() };
  const context = {
    process: { exit, stdout },
  } as unknown as LocalContext;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DEVELOPMENT_MODE_VALIDATE_ONLY = 'false';
    buildOpaBundleTarballMock.mockResolvedValue('/tmp/bundle.tar.gz');
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'unlinkSync').mockImplementation(() => undefined);
  });

  it('creates a bundle when the name does not exist yet', async () => {
    const post = vi.fn().mockReturnValue({
      json: vi.fn().mockResolvedValue({
        bundle: {
          id: 'bundle-id',
          bundleName: 'main',
          description: null,
          activeVersionId: null,
          lastActivatedAt: null,
          createdAt: '2026-06-25T00:00:00.000Z',
          updatedAt: '2026-06-25T00:00:00.000Z',
        },
        version: sampleVersion,
      }),
    });
    buildPolicyEngineClientMock.mockReturnValue({ post });
    resolveBundleIdByNameMock.mockResolvedValue(undefined);

    await publish.call(context, {
      dir: './policies',
      bundleName: 'main',
      auth: 'test-key',
      transcendUrl: 'https://api.transcend.io',
      json: true,
    });

    expect(post).toHaveBeenCalledWith('api/v1/policy-engine/policy-bundles', expect.any(Object));
    expect(stdout.write).toHaveBeenCalled();
  });

  it('uploads a new version when the bundle already exists', async () => {
    const post = vi.fn().mockReturnValue({
      json: vi.fn().mockResolvedValue({
        version: sampleVersion,
      }),
    });
    buildPolicyEngineClientMock.mockReturnValue({ post });
    resolveBundleIdByNameMock.mockResolvedValue('existing-bundle-id');

    await publish.call(context, {
      dir: './policies',
      bundleName: 'main',
      auth: 'test-key',
      transcendUrl: 'https://api.transcend.io',
      json: false,
    });

    expect(post).toHaveBeenCalledWith(
      'api/v1/policy-engine/policy-bundles/existing-bundle-id/versions',
      expect.any(Object),
    );
  });
});
