import fs from 'node:fs';

import { ConsentBundleType } from '@transcend-io/privacy-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildContextForTest } from '../../../../lib/tests/helpers/buildContextForTest.js';
import { deploy, type DeployCommandFlags } from '../impl.js';

const H = vi.hoisted(() => ({
  deployConsentManagerBundles: vi.fn(),
}));

vi.mock('../../../../lib/consent-manager/deployConsentManagerBundles.js', () => ({
  deployConsentManagerBundles: H.deployConsentManagerBundles,
}));

const baseFlags: DeployCommandFlags = {
  auth: 'api-key',
  wait: false,
  waitTimeoutSeconds: 600,
  transcendUrl: 'https://api.example.com',
};

describe('consent deploy', () => {
  const ctx = buildContextForTest({ env: { DEVELOPMENT_MODE_VALIDATE_ONLY: 'false' } });

  beforeEach(() => {
    vi.clearAllMocks();
    ctx.reset();
    H.deployConsentManagerBundles.mockResolvedValue(undefined);
  });

  it('exits before doing work in validation-only mode', async () => {
    const validationContext = buildContextForTest({
      env: { DEVELOPMENT_MODE_VALIDATE_ONLY: 'true' },
    });

    await expect(deploy.call(validationContext, baseFlags)).rejects.toMatchObject({ code: 0 });
    expect(H.deployConsentManagerBundles).not.toHaveBeenCalled();
  });

  it('deploys both bundle types by default with a single API key', async () => {
    await deploy.call(ctx, baseFlags);

    expect(H.deployConsentManagerBundles).toHaveBeenCalledWith({
      auth: 'api-key',
      transcendUrl: 'https://api.example.com',
      bundleTypes: [ConsentBundleType.Test, ConsentBundleType.Production],
      expectBundleId: undefined,
      wait: false,
      waitTimeoutSeconds: 600,
    });
    expect(ctx.stdout).toContain('Successfully deployed Consent Manager!');
  });

  it('passes the flags through', async () => {
    await deploy.call(ctx, {
      ...baseFlags,
      bundleTypes: [ConsentBundleType.Test],
      expectBundleId: 'bundle-1',
      wait: true,
      waitTimeoutSeconds: 30,
    });

    expect(H.deployConsentManagerBundles).toHaveBeenCalledWith(
      expect.objectContaining({
        bundleTypes: [ConsentBundleType.Test],
        expectBundleId: 'bundle-1',
        wait: true,
        waitTimeoutSeconds: 30,
      }),
    );
  });

  it('deploys once per organization when auth is a file of API keys', async () => {
    const fileCtx = buildContextForTest({
      fs: {
        ...fs,
        existsSync: () => true,
        readFileSync: (() =>
          JSON.stringify([
            { organizationName: 'Org A', organizationId: 'org-a', apiKey: 'key-a' },
            { organizationName: 'Org B', organizationId: 'org-b', apiKey: 'key-b' },
          ])) as unknown as typeof fs.readFileSync,
      },
    });

    await deploy.call(fileCtx, { ...baseFlags, auth: './keys.json' });

    expect(H.deployConsentManagerBundles.mock.calls.map(([o]) => o.auth)).toEqual([
      'key-a',
      'key-b',
    ]);
  });

  it('rejects expectBundleId with a file of API keys', async () => {
    const fileCtx = buildContextForTest({
      fs: {
        ...fs,
        existsSync: () => true,
        readFileSync: (() =>
          JSON.stringify([
            { organizationName: 'Org A', organizationId: 'org-a', apiKey: 'key-a' },
          ])) as unknown as typeof fs.readFileSync,
      },
    });

    await expect(
      deploy.call(fileCtx, { ...baseFlags, auth: './keys.json', expectBundleId: 'bundle-1' }),
    ).rejects.toMatchObject({ code: 1 });
    expect(H.deployConsentManagerBundles).not.toHaveBeenCalled();
  });
});
