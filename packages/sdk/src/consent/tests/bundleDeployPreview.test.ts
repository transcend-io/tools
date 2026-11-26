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

function coreWithDeploymentId(deploymentId: string): Record<string, unknown> {
  return {
    version: 'v1',
    bundledModuleData: {
      uiV2: {
        loadOptions: { deploymentId, other: 'same' },
        mobileUiLoadOptions: { deploymentId, other: 'same' },
      },
    },
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

  it('ignores deploymentId, which changes on every deploy', () => {
    const diff = diffConsentBundleDeploy(
      inputs({
        pending: { core: coreWithDeploymentId('new'), messages: { en: { title: 'Same' } } },
        deployedCore: coreWithDeploymentId('old'),
        deployedModules: { messages: { en: { title: 'Same' } } },
      }),
    );
    expect(diff.hasChanges).toBe(false);
  });

  describe('UI v2 messages', () => {
    const nestedPending = {
      'default-consent': { en: { a: '1' }, 'pt-BR': { a: 'y' } },
    };

    it('treats flat CDN keys and nested saved config with equal content as unchanged', () => {
      const diff = diffConsentBundleDeploy(
        inputs({
          pending: { core: { version: 'v1' }, uiV2Messages: nestedPending },
          deployedCore: { version: 'v1' },
          deployedModules: {
            uiV2Messages: {
              'uiV2-default-consent-en': { a: '1' },
              'uiV2-default-consent-pt-BR': { a: 'y' },
            },
          },
        }),
      );
      expect(diff.hasChanges).toBe(false);
    });

    it('reports changed variant and locale pairs', () => {
      const diff = diffConsentBundleDeploy(
        inputs({
          pending: { core: { version: 'v1' }, uiV2Messages: nestedPending },
          deployedCore: { version: 'v1' },
          deployedModules: {
            uiV2Messages: {
              'uiV2-default-consent-en': { a: '1' },
              'uiV2-default-consent-pt-BR': { a: 'x' },
            },
          },
        }),
      );
      const uiV2 = diff.modules.find((m) => m.key === 'uiV2Messages');
      expect(uiV2?.highlights).toEqual(['default-consent/pt-BR']);
    });
  });

  describe('messages', () => {
    it('compares locale codes, not LOCALE_KEY names', () => {
      const diff = diffConsentBundleDeploy(
        inputs({
          pending: { core: { version: 'v1' }, messages: { 'af-ZA': { a: '1' } } },
          deployedCore: { version: 'v1' },
          // fetchDeployedCompanionModules keys deployed locale modules by code
          deployedModules: { messages: { 'af-ZA': { a: '1' } } },
        }),
      );
      expect(diff.hasChanges).toBe(false);
    });
  });
});

describe('summarizeConsentBundleDeployDiff', () => {
  it('writes one line with environment, time zone, and module highlights', () => {
    const diff = diffConsentBundleDeploy(inputs());
    const summary = summarizeConsentBundleDeployDiff(diff, ConsentBundleType.Production);
    expect(summary).toMatch(
      /^PRODUCTION \(\/cm\) changed since [A-Z][a-z]{2} \d{1,2}, \d{4}, \d{1,2}:\d{2} [AP]M \S+: Core \(domains, version\); Messages \(en\)\.$/,
    );
    expect(summary).not.toContain('\n');
  });

  it('does not tell the agent to call another tool', () => {
    const diff = diffConsentBundleDeploy(inputs());
    expect(summarizeConsentBundleDeployDiff(diff, ConsentBundleType.Test)).not.toContain(
      'consent_preview_deploy',
    );
  });

  it('caps highlights per module and counts the rest', () => {
    const locales = ['en', 'fr-FR', 'de-DE', 'es-ES', 'it-IT', 'ja-JP', 'ko-KR', 'nl-NL'];
    const diff = diffConsentBundleDeploy(
      inputs({
        pending: {
          core: { version: 'v1' },
          messages: Object.fromEntries(locales.map((locale) => [locale, { a: '1' }])),
        },
        deployedCore: { version: 'v1' },
        deployedModules: { messages: {} },
      }),
    );
    expect(summarizeConsentBundleDeployDiff(diff, ConsentBundleType.Test)).toContain(
      'Messages (de-DE, en, es-ES, fr-FR, it-IT, and 3 more).',
    );
  });

  it('labels modules that have no highlights', () => {
    const diff = diffConsentBundleDeploy(
      inputs({
        pending: { core: { version: 'v1' }, stylesheet: '.a{}' },
        deployedCore: { version: 'v1' },
        deployedModules: { stylesheet: '.b{}' },
      }),
    );
    expect(summarizeConsentBundleDeployDiff(diff, ConsentBundleType.Test)).toMatch(
      /TEST \(\/cm-test\) changed since .*: Stylesheet\.$/,
    );
  });

  it('falls back when the last deploy time is unknown', () => {
    const diff = diffConsentBundleDeploy(inputs({ lastDeployedAt: null }));
    expect(summarizeConsentBundleDeployDiff(diff, ConsentBundleType.Test)).toContain(
      'changed since the last deploy:',
    );
  });

  it('reports first deploys and no-change cases', () => {
    const first = diffConsentBundleDeploy(
      inputs({ firstDeploy: true, deployedCore: null, deployedModules: {} }),
    );
    expect(summarizeConsentBundleDeployDiff(first, ConsentBundleType.Test)).toBe(
      'First deploy to TEST (/cm-test). All saved configuration will be published.',
    );

    const same = diffConsentBundleDeploy(
      inputs({
        pending: { core: { version: 'v1' } },
        deployedCore: { version: 'v1' },
        deployedModules: {},
      }),
    );
    expect(summarizeConsentBundleDeployDiff(same, ConsentBundleType.Production)).toMatch(
      /^No pending changes for PRODUCTION \(\/cm\) since /,
    );
  });
});
