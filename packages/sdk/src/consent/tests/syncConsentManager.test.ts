import type { GraphQLClient } from 'graphql-request';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../api/makeGraphQLRequest.js', () => ({
  makeGraphQLRequest: vi.fn(async () => ({
    updateConsentManager: { clientMutationId: '1' },
  })),
  NOOP_LOGGER: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../fetchConsentManagerId.js', () => ({
  fetchConsentManagerId: vi.fn(async () => 'bundle-1'),
}));

import { makeGraphQLRequest } from '../../api/makeGraphQLRequest.js';
import { UPDATE_CONSENT_MANAGER_DEPLOYMENT_WEBHOOK } from '../gqls/consentManager.js';
import { syncConsentManager } from '../syncConsentManager.js';

const client = {} as GraphQLClient;

describe('syncConsentManager deployment webhook', () => {
  beforeEach(() => {
    vi.mocked(makeGraphQLRequest).mockClear();
  });

  it('sends webhookUrl and headers when both are provided', async () => {
    await syncConsentManager(client, {
      webhookUrl: 'https://example.com/hook',
      webhookHeaders: [{ name: 'x-transcend-token', value: 'secret', isSecret: true }],
    });

    expect(makeGraphQLRequest).toHaveBeenCalledWith(
      client,
      UPDATE_CONSENT_MANAGER_DEPLOYMENT_WEBHOOK,
      expect.objectContaining({
        variables: {
          airgapBundleId: 'bundle-1',
          input: {
            webhookUrl: 'https://example.com/hook',
            headers: [{ name: 'x-transcend-token', value: 'secret', isSecret: true }],
          },
        },
      }),
    );
  });

  it('omits headers when only webhookUrl is set', async () => {
    await syncConsentManager(client, {
      webhookUrl: 'https://example.com/hook',
    });

    const deploymentCall = vi
      .mocked(makeGraphQLRequest)
      .mock.calls.find(([, query]) => query === UPDATE_CONSENT_MANAGER_DEPLOYMENT_WEBHOOK);
    expect(deploymentCall?.[2]?.variables?.input).toEqual({
      webhookUrl: 'https://example.com/hook',
    });
  });
});
