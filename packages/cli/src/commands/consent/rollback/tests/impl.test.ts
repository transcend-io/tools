import fs from 'node:fs';

import { ConsentBundleType } from '@transcend-io/privacy-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildContextForTest } from '../../../../lib/tests/helpers/buildContextForTest.js';
import { rollback, type RollbackCommandFlags } from '../impl.js';

const H = vi.hoisted(() => ({
  rollbackConsentManagerBundles: vi.fn(),
}));

vi.mock('../../../../lib/consent-manager/rollbackConsentManagerBundles.js', () => ({
  rollbackConsentManagerBundles: H.rollbackConsentManagerBundles,
}));

const baseFlags: RollbackCommandFlags = {
  auth: 'api-key',
  bundleTypes: [ConsentBundleType.Test],
  version: '1.0.0',
  dryRun: false,
  transcendUrl: 'https://api.example.com',
};

describe('consent rollback', () => {
  const ctx = buildContextForTest({ env: { DEVELOPMENT_MODE_VALIDATE_ONLY: 'false' } });

  beforeEach(() => {
    vi.clearAllMocks();
    ctx.reset();
    H.rollbackConsentManagerBundles.mockResolvedValue(undefined);
  });

  it('rolls back with the explicit target', async () => {
    await rollback.call(ctx, baseFlags);

    expect(H.rollbackConsentManagerBundles).toHaveBeenCalledWith({
      auth: 'api-key',
      transcendUrl: 'https://api.example.com',
      bundleTypes: [ConsentBundleType.Test],
      version: '1.0.0',
      dryRun: false,
    });
    expect(ctx.stdout).toContain('Successfully rolled back!');
  });

  it('says nothing changed on a dry run', async () => {
    await rollback.call(ctx, { ...baseFlags, dryRun: true });

    expect(ctx.stdout).toContain('Dry run complete. Nothing was changed.');
  });

  it('rejects a file of API keys', async () => {
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
      rollback.call(fileCtx, { ...baseFlags, auth: './keys.json' }),
    ).rejects.toMatchObject({ code: 1 });
    expect(H.rollbackConsentManagerBundles).not.toHaveBeenCalled();
  });

  it('exits before doing work in validation-only mode', async () => {
    const validationContext = buildContextForTest({
      env: { DEVELOPMENT_MODE_VALIDATE_ONLY: 'true' },
    });

    await expect(rollback.call(validationContext, baseFlags)).rejects.toMatchObject({ code: 0 });
    expect(H.rollbackConsentManagerBundles).not.toHaveBeenCalled();
  });
});
