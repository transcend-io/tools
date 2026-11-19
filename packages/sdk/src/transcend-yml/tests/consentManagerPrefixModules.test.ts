import type { GraphQLClient } from 'graphql-request';
import { describe, expect, it, vi } from 'vitest';

import { TranscendPullResource } from '../enums.js';
import { pullTranscendConfiguration } from '../pullTranscendConfiguration.js';
import { syncConfigurationToTranscend } from '../syncConfigurationToTranscend.js';

const AIRGAP_BUNDLE_ID = 'bundle-1';

/** Prefix module nodes the mocked API returns */
type PrefixModuleNode = {
  /** Link ID */
  id: string;
  /** Config JSON */
  config: string | null;
  /** Attached release */
  airgapPrefixModuleRelease: {
    /** Version */
    version: string;
    /** Module */
    airgapPrefixModule: {
      /** ID */
      id: string;
      /** Name */
      name: string;
      /** Owning organization */
      organizationId: string | null;
    };
  };
};

/**
 * Build a mocked GraphQL client that answers by operation name
 *
 * @param prefixModules - Prefix modules to return for the bundle
 * @returns The client and the list of operation names that were requested
 */
function buildClient(prefixModules: PrefixModuleNode[]): {
  /** Mocked client */
  client: GraphQLClient;
  /** Operation names requested, in order */
  operations: string[];
} {
  const operations: string[] = [];
  const request = vi.fn(async (document: unknown, variables?: Record<string, unknown>) => {
    const operation = String(document).match(/(?:query|mutation)\s+(\w+)/)?.[1] ?? '';
    operations.push(operation);
    switch (operation) {
      case 'TranscendCliFetchConsentManagerId':
        return { consentManager: { consentManager: { id: AIRGAP_BUNDLE_ID } } };
      case 'TranscendCliFetchConsentManager':
        return {
          consentManager: {
            consentManager: {
              id: AIRGAP_BUNDLE_ID,
              bundleURL: 'https://cdn.transcend.io/cm/prod/airgap.js',
              testBundleURL: 'https://cdn.transcend.io/cm-test/prod/airgap.js',
              configuration: { domains: ['example.com'] },
            },
          },
        };
      case 'TranscendCliExperiences':
        return { experiences: { nodes: [], totalCount: 0 } };
      case 'TranscendCliConsentUiVariants':
        return { consentUiVariants: { nodes: [], totalCount: 0 } };
      case 'TranscendCliConsentUiThemes':
        return { consentUiThemes: { nodes: [], totalCount: 0 } };
      case 'TranscendCliFetchConsentManagerTheme':
        return { consentManagerTheme: { theme: { primaryColor: '#000', fontColor: '#fff' } } };
      case 'TranscendCliFetchAirgapBundlePrefixModules': {
        const offset = Number(variables?.offset ?? 0);
        const first = Number(variables?.first ?? prefixModules.length);
        return {
          airgapBundleAirgapPrefixModules: {
            nodes: prefixModules.slice(offset, offset + first),
            totalCount: prefixModules.length,
          },
        };
      }
      default:
        throw new Error(`Unexpected operation: ${operation}`);
    }
  });
  return { client: { request } as unknown as GraphQLClient, operations };
}

/**
 * Build a prefix module node
 *
 * @param name - Module name
 * @param overrides - Overrides
 * @returns Prefix module node
 */
function buildNode(
  name: string,
  overrides: {
    /** Version */
    version?: string;
    /** Config */
    config?: string | null;
    /** Owning organization */
    organizationId?: string | null;
  } = {},
): PrefixModuleNode {
  return {
    id: `link-${name}`,
    config: overrides.config === undefined ? null : overrides.config,
    airgapPrefixModuleRelease: {
      version: overrides.version ?? '1.0.0',
      airgapPrefixModule: {
        id: `module-${name}`,
        name,
        organizationId: overrides.organizationId === undefined ? null : overrides.organizationId,
      },
    },
  };
}

const pullOptions = {
  pageSize: 50,
  debug: false,
  dataSiloIds: [],
  integrationNames: [],
  resources: [TranscendPullResource.ConsentManager],
};

describe('consent-manager prefixModules pull', () => {
  it('fills prefixModules with name, catalog, version, and config', async () => {
    const { client } = buildClient([
      buildNode('geo-gate', { version: '2.1.0', config: '{"regions":["EU"]}' }),
      buildNode('custom-prefix', { version: '0.3.0', organizationId: 'org-1' }),
    ]);

    const result = await pullTranscendConfiguration(client, pullOptions);

    expect(result['consent-manager']?.prefixModules).toEqual([
      { name: 'geo-gate', catalog: 'transcend', version: '2.1.0', config: '{"regions":["EU"]}' },
      { name: 'custom-prefix', catalog: 'organization', version: '0.3.0', config: undefined },
    ]);
  });

  it('pages through all prefix modules on the bundle', async () => {
    const nodes = Array.from({ length: 51 }, (_, i) => buildNode(`module-${i}`));
    const { client } = buildClient(nodes);

    const result = await pullTranscendConfiguration(client, pullOptions);

    expect(result['consent-manager']?.prefixModules).toHaveLength(51);
  });

  it('omits prefixModules when the bundle has none', async () => {
    const { client } = buildClient([]);

    const result = await pullTranscendConfiguration(client, pullOptions);

    expect(result['consent-manager']).toBeDefined();
    expect(result['consent-manager']?.prefixModules).toBeUndefined();
  });

  it('does not query prefix modules when consent-manager is not pulled', async () => {
    const { client, operations } = buildClient([buildNode('geo-gate')]);

    const result = await pullTranscendConfiguration(client, { ...pullOptions, resources: [] });

    expect(result['consent-manager']).toBeUndefined();
    expect(operations).not.toContain('TranscendCliFetchAirgapBundlePrefixModules');
  });
});

describe('consent-manager prefixModules push', () => {
  it('ignores prefixModules without any mutation or warning', async () => {
    const { client, operations } = buildClient([]);
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };

    const result = await syncConfigurationToTranscend(
      {
        'consent-manager': {
          prefixModules: [
            { name: 'geo-gate', catalog: 'transcend', version: '2.1.0', config: '{"a":1}' },
          ],
        },
      },
      client,
      { logger },
    );

    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
    expect(logger.warn).not.toHaveBeenCalled();
    expect(operations.filter((op) => /PrefixModule/i.test(op))).toEqual([]);
    expect(operations.every((op) => op.startsWith('TranscendCliFetch'))).toBe(true);
  });
});
