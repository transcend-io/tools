import { ConsentBundleType } from '@transcend-io/privacy-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildContextForTest } from '../../../../lib/tests/helpers/buildContextForTest.js';
import { previewDeploy, type PreviewDeployCommandFlags } from '../impl.js';

const H = vi.hoisted(() => ({
  previewConsentManagerDeploy: vi.fn(),
}));

vi.mock('../../../../lib/consent-manager/previewConsentManagerDeploy.js', () => ({
  previewConsentManagerDeploy: H.previewConsentManagerDeploy,
}));

const baseFlags: PreviewDeployCommandFlags = {
  auth: 'api-key',
  json: false,
  transcendUrl: 'https://api.example.com',
};

const preview = (bundleType: ConsentBundleType, hasChanges: boolean) => ({
  bundleType,
  hasChanges,
  summary: `${bundleType} summary`,
  diff: { firstDeploy: false, lastDeployedAt: null, hasChanges, modules: [] },
});

describe('consent preview-deploy', () => {
  const ctx = buildContextForTest({ env: { DEVELOPMENT_MODE_VALIDATE_ONLY: 'false' } });

  beforeEach(() => {
    vi.clearAllMocks();
    ctx.reset();
  });

  it('prints a summary and whether there are changes', async () => {
    H.previewConsentManagerDeploy.mockResolvedValue([
      preview(ConsentBundleType.Test, true),
      preview(ConsentBundleType.Production, false),
    ]);

    await previewDeploy.call(ctx, baseFlags);

    expect(ctx.stdout).toContain('TEST summary');
    expect(ctx.stdout).toContain('TEST: there are changes to deploy.');
    expect(ctx.stdout).toContain('PRODUCTION: there are no changes to deploy.');
    expect(ctx.exit).not.toHaveBeenCalled();
  });

  it('prints only JSON with --json', async () => {
    H.previewConsentManagerDeploy.mockResolvedValue([preview(ConsentBundleType.Test, true)]);

    await previewDeploy.call(ctx, { ...baseFlags, json: true });

    const parsed = JSON.parse(ctx.stdout);
    expect(parsed.organizations).toHaveLength(1);
    expect(parsed.organizations[0].results[0]).toMatchObject({
      bundleType: 'TEST',
      hasChanges: true,
    });
  });

  it('passes bundle types through', async () => {
    H.previewConsentManagerDeploy.mockResolvedValue([]);

    await previewDeploy.call(ctx, { ...baseFlags, bundleTypes: [ConsentBundleType.Production] });

    expect(H.previewConsentManagerDeploy).toHaveBeenCalledWith({
      auth: 'api-key',
      transcendUrl: 'https://api.example.com',
      bundleTypes: [ConsentBundleType.Production],
    });
  });

  it('exits before doing work in validation-only mode', async () => {
    const validationContext = buildContextForTest({
      env: { DEVELOPMENT_MODE_VALIDATE_ONLY: 'true' },
    });

    await expect(previewDeploy.call(validationContext, baseFlags)).rejects.toMatchObject({
      code: 0,
    });
    expect(H.previewConsentManagerDeploy).not.toHaveBeenCalled();
  });
});
