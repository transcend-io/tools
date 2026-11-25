import { ConsentBundleType } from '@transcend-io/privacy-types';
import type { GraphQLClient } from 'graphql-request';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const makeGraphQLRequest = vi.fn();

vi.mock('../../api/makeGraphQLRequest.js', () => ({
  makeGraphQLRequest: (...args: unknown[]) => makeGraphQLRequest(...args),
}));

import {
  AIRGAP_BUNDLE_ROLLBACK_FIELDS,
  AIRGAP_BUNDLE_ROLLBACK_VERSIONS,
  ROLLBACK_AIRGAP_BUNDLE,
  TranscendAirgapBundleRollbackBundleField,
  TranscendAirgapBundleRollbackMobileField,
} from '../gqls/consentManager.js';
import {
  buildRollbackInputFromVersion,
  fetchConsentManagerRollbackTarget,
  rollbackConsentManager,
} from '../rollbackConsentManager.js';

const client = {} as GraphQLClient;

const versionsResponse = {
  airgapBundleVersions: {
    nodes: [
      {
        version: '3.0.0',
        createdAt: '2024-03-01',
        cdn: 'CLOUDFLARE',
        core: 'core-3',
        isTest: false,
      },
      {
        version: '2.0.0',
        createdAt: '2024-02-01',
        cdn: 'CLOUDFLARE',
        core: 'core-2',
        ui: 'ui-2',
        xdi: null,
        isTest: false,
      },
      {
        version: '1.0.0',
        createdAt: '2024-01-01',
        cdn: 'CLOUDFLARE',
        core: 'core-1',
        isTest: false,
      },
    ],
  },
};

describe('rollbackConsentManager', () => {
  beforeEach(() => {
    makeGraphQLRequest.mockReset();
  });

  it('queries every field the rollback input accepts', () => {
    const query = String(AIRGAP_BUNDLE_ROLLBACK_VERSIONS);
    expect(AIRGAP_BUNDLE_ROLLBACK_FIELDS).toContain(TranscendAirgapBundleRollbackBundleField.Core);
    expect(AIRGAP_BUNDLE_ROLLBACK_FIELDS).toContain(TranscendAirgapBundleRollbackBundleField.Cdn);
    expect(AIRGAP_BUNDLE_ROLLBACK_FIELDS).toContain(
      TranscendAirgapBundleRollbackMobileField.IsTest,
    );
    AIRGAP_BUNDLE_ROLLBACK_FIELDS.forEach((field) => {
      expect(query).toContain(field);
    });
  });

  it('builds mutation input from a version and drops empty modules', () => {
    const input = buildRollbackInputFromVersion({
      version: '2.0.0',
      createdAt: '2024-02-01',
      cdn: 'CLOUDFLARE',
      core: 'core-2',
      ui: 'ui-2',
      xdi: null,
      isTest: true,
    });

    expect(input).toEqual({ cdn: 'CLOUDFLARE', core: 'core-2', ui: 'ui-2', isTest: true });
  });

  it('finds an earlier version and queries the right environment', async () => {
    makeGraphQLRequest.mockResolvedValueOnce(versionsResponse);

    const target = await fetchConsentManagerRollbackTarget(client, {
      id: 'bundle-1',
      bundleType: ConsentBundleType.Test,
      version: '2.0.0',
    });

    expect(target).toEqual({
      version: '2.0.0',
      deployedAt: '2024-02-01',
      input: { cdn: 'CLOUDFLARE', core: 'core-2', ui: 'ui-2', isTest: false },
    });
    expect(makeGraphQLRequest.mock.calls[0]![2].variables).toMatchObject({
      id: 'bundle-1',
      input: { isTest: true },
    });
  });

  it('refuses to roll back to the live version', async () => {
    makeGraphQLRequest.mockResolvedValueOnce(versionsResponse);

    await expect(
      fetchConsentManagerRollbackTarget(client, {
        id: 'bundle-1',
        bundleType: ConsentBundleType.Production,
        version: '3.0.0',
      }),
    ).rejects.toThrow('already live');
  });

  it('lists available versions when the target is missing', async () => {
    makeGraphQLRequest.mockResolvedValueOnce(versionsResponse);

    await expect(
      fetchConsentManagerRollbackTarget(client, {
        id: 'bundle-1',
        bundleType: ConsentBundleType.Production,
        version: '9.9.9',
      }),
    ).rejects.toThrow('Available versions: 2.0.0, 1.0.0');
  });

  it('sends the rollback mutation', async () => {
    makeGraphQLRequest
      .mockResolvedValueOnce(versionsResponse)
      .mockResolvedValueOnce({ rollbackAirgapBundle: { success: true } });

    const target = await rollbackConsentManager(client, {
      id: 'bundle-1',
      bundleType: ConsentBundleType.Production,
      version: '1.0.0',
    });

    expect(target.version).toBe('1.0.0');
    expect(makeGraphQLRequest).toHaveBeenCalledTimes(2);
    expect(makeGraphQLRequest.mock.calls[1]![1]).toBe(ROLLBACK_AIRGAP_BUNDLE);
    expect(makeGraphQLRequest.mock.calls[1]![2].variables).toEqual({
      id: 'bundle-1',
      input: { cdn: 'CLOUDFLARE', core: 'core-1', isTest: false },
    });
  });

  it('throws when the backend does not accept the rollback', async () => {
    makeGraphQLRequest
      .mockResolvedValueOnce(versionsResponse)
      .mockResolvedValueOnce({ rollbackAirgapBundle: { success: false } });

    await expect(
      rollbackConsentManager(client, {
        id: 'bundle-1',
        bundleType: ConsentBundleType.Production,
        version: '1.0.0',
      }),
    ).rejects.toThrow('was not accepted');
  });
});
