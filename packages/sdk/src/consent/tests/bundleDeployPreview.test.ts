import { ConsentBundleType } from '@transcend-io/privacy-types';
import { describe, expect, it } from 'vitest';

import {
  diffConsentBundleDeploy,
  summarizeConsentBundleDeployDiff,
} from '../bundleDeployPreview/index.js';
import type { ConsentBundleDeployDiffInputs } from '../bundleDeployPreview/types.js';

function inputs(
  overrides: Partial<ConsentBundleDeployDiffInputs> = {},
): ConsentBundleDeployDiffInputs {
  return {
    pending: {
      core: { version: 'v2', domains: ['a.com', 'b.com'] },
      messages: { en: { title: 'New' } },
    },
    deployedCore: { version: 'v1', domains: ['a.com'] },
    deployedModules: { messages: { en: { title: 'Old' } } },
    lastDeployedAt: '2024-01-01T00:00:00.000Z',
    firstDeploy: false,
    bundleUrl: 'https://transcend-cdn.com/cm/airgap.js',
    useIabFramework: false,
    ...overrides,
  };
}

describe('diffConsentBundleDeploy', () => {
  it('detects core and message changes', () => {
    const diff = diffConsentBundleDeploy(inputs());
    expect(diff.hasChanges).toBe(true);
    expect(diff.modules.some((m) => m.key === 'core' && m.changesMade)).toBe(true);
    expect(diff.modules.some((m) => m.key === 'messages' && m.changesMade)).toBe(true);
  });

  it('treats first deploy as all new', () => {
    const diff = diffConsentBundleDeploy(
      inputs({ firstDeploy: true, deployedCore: null, deployedModules: {} }),
    );
    expect(diff.firstDeploy).toBe(true);
    expect(diff.hasChanges).toBe(true);
  });
});

describe('summarizeConsentBundleDeployDiff', () => {
  it('lists environment and core highlights', () => {
    const diff = diffConsentBundleDeploy(inputs());
    const summary = summarizeConsentBundleDeployDiff(diff, ConsentBundleType.Production);
    expect(summary).toContain('PRODUCTION');
    expect(summary).toContain('Core:');
  });
});
