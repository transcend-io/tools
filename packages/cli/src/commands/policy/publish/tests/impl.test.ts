import fs from 'node:fs';

import { describe, expect, it, vi, beforeEach } from 'vitest';

import { buildContextForTest } from '../../../../lib/tests/helpers/buildContextForTest.js';
import { publish } from '../impl.js';

const buildOpaBundleTarballMock = vi.hoisted(() => vi.fn());
const buildPolicyEngineClientMock = vi.hoisted(() => vi.fn());
const resolveBundleIdByNameMock = vi.hoisted(() => vi.fn());
const inquirerConfirmBooleanMock = vi.hoisted(() => vi.fn());

vi.mock('../../helpers/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../helpers/index.js')>();
  return {
    ...actual,
    buildOpaBundleTarball: buildOpaBundleTarballMock,
    buildPolicyEngineClient: buildPolicyEngineClientMock,
    resolveBundleIdByName: resolveBundleIdByNameMock,
    buildPolicyBundleFormData: vi.fn(() => new FormData()),
    defaultPolicyVersionLabel: vi.fn(() => 'abc123'),
  };
});

vi.mock('../../../../lib/helpers/inquirer.js', () => ({
  inquirerConfirmBoolean: inquirerConfirmBooleanMock,
}));

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
  const existsSync = vi.fn<typeof fs.existsSync>(() => true);
  const unlinkSync = vi.fn<typeof fs.unlinkSync>();
  const testFs = { ...fs, existsSync, unlinkSync };
  const context = buildContextForTest({
    env: { DEVELOPMENT_MODE_VALIDATE_ONLY: 'false' },
    exitBehavior: 'record',
    fs: testFs,
    stderrIsTTY: true,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    context.reset();
    buildOpaBundleTarballMock.mockResolvedValue('/tmp/bundle.tar.gz');
    existsSync.mockReturnValue(true);
    inquirerConfirmBooleanMock.mockResolvedValue(true);
  });

  it('creates a bundle when the name does not exist yet and --yes is set', async () => {
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

    await publish.call(
      context,
      {
        'bundle-name': 'main',
        auth: 'test-key',
        'transcend-url': 'https://api.transcend.io',
        json: true,
        yes: true,
      },
      './policies',
    );

    expect(post).toHaveBeenCalledWith('v1/policy-engine/policy-bundles', expect.any(Object));
    expect(inquirerConfirmBooleanMock).not.toHaveBeenCalled();
    expect(JSON.parse(context.stdout)).toMatchObject({
      version: { version: 'abc123' },
    });
    expect(context.stdout).not.toContain('Policy bundle version uploaded successfully.');
    expect(context.stdout).not.toContain('transcend policy activate');
  });

  it('uploads a new version when the bundle already exists', async () => {
    const post = vi.fn().mockReturnValue({
      json: vi.fn().mockResolvedValue({
        version: sampleVersion,
      }),
    });
    buildPolicyEngineClientMock.mockReturnValue({ post });
    resolveBundleIdByNameMock.mockResolvedValue('existing-bundle-id');

    await publish.call(
      context,
      {
        'bundle-name': 'main',
        auth: 'test-key',
        'transcend-url': 'https://api.transcend.io',
        json: false,
        yes: false,
      },
      './policies',
    );

    expect(post).toHaveBeenCalledWith(
      'v1/policy-engine/policy-bundles/existing-bundle-id/versions',
      expect.any(Object),
    );
    expect(inquirerConfirmBooleanMock).not.toHaveBeenCalled();
  });

  it('does not prompt in JSON mode when a new bundle needs confirmation', async () => {
    const post = vi.fn();
    buildPolicyEngineClientMock.mockReturnValue({ post });
    resolveBundleIdByNameMock.mockResolvedValue(undefined);

    await publish.call(
      context,
      {
        'bundle-name': 'main',
        auth: 'test-key',
        'transcend-url': 'https://api.transcend.io',
        json: true,
        yes: false,
      },
      './policies',
    );

    expect(post).not.toHaveBeenCalled();
    expect(inquirerConfirmBooleanMock).not.toHaveBeenCalled();
    expect(context.exit).toHaveBeenCalledWith(1);
  });

  it('prompts before creating a bundle when the name does not exist', async () => {
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
    inquirerConfirmBooleanMock.mockResolvedValue(true);

    await publish.call(
      context,
      {
        'bundle-name': 'main',
        auth: 'test-key',
        'transcend-url': 'https://api.transcend.io',
        json: false,
        yes: false,
      },
      './policies',
    );

    expect(inquirerConfirmBooleanMock).toHaveBeenCalledWith({
      message:
        'No policy bundle named "main" exists. Create a new bundle and upload its first version?',
    });
    expect(post).toHaveBeenCalledWith('v1/policy-engine/policy-bundles', expect.any(Object));
  });

  it('cancels publish when the user declines bundle creation', async () => {
    const post = vi.fn();
    buildPolicyEngineClientMock.mockReturnValue({ post });
    resolveBundleIdByNameMock.mockResolvedValue(undefined);
    inquirerConfirmBooleanMock.mockResolvedValue(false);

    await publish.call(
      context,
      {
        'bundle-name': 'main',
        auth: 'test-key',
        'transcend-url': 'https://api.transcend.io',
        json: false,
        yes: false,
      },
      './policies',
    );

    expect(post).not.toHaveBeenCalled();
    expect(context.stdout).toContain('Publish cancelled.');
  });

  it('fails when prompt output is not interactive and creating a bundle without --yes', async () => {
    const post = vi.fn();
    buildPolicyEngineClientMock.mockReturnValue({ post });
    resolveBundleIdByNameMock.mockResolvedValue(undefined);
    const nonInteractiveContext = buildContextForTest({
      env: { DEVELOPMENT_MODE_VALIDATE_ONLY: 'false' },
      exitBehavior: 'record',
      fs: testFs,
      stderrIsTTY: false,
    });

    await publish.call(
      nonInteractiveContext,
      {
        'bundle-name': 'main',
        auth: 'test-key',
        'transcend-url': 'https://api.transcend.io',
        json: false,
        yes: false,
      },
      './policies',
    );

    expect(post).not.toHaveBeenCalled();
    expect(nonInteractiveContext.exit).toHaveBeenCalledWith(1);
    expect(nonInteractiveContext.stderr).toContain(
      'Cannot create a new bundle in non-interactive or JSON mode; pass --yes to confirm.',
    );
  });
});
