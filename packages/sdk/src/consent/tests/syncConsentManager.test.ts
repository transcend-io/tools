import type { GraphQLClient } from 'graphql-request';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockLogger } = vi.hoisted(() => ({
  mockLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../api/makeGraphQLRequest.js', () => ({
  makeGraphQLRequest: vi.fn(async () => ({
    updateConsentManager: { clientMutationId: '1' },
    toggleConsentManagerEnforcement: { clientMutationId: '1' },
  })),
  NOOP_LOGGER: mockLogger,
}));

vi.mock('../fetchConsentManagerId.js', () => ({
  fetchConsentManagerId: vi.fn(async () => 'bundle-1'),
}));

import { makeGraphQLRequest } from '../../api/makeGraphQLRequest.js';
import {
  TOGGLE_CONSENT_MANAGER_ENFORCEMENT,
  UPDATE_CONSENT_MANAGER_DEPLOYMENT_WEBHOOK,
} from '../gqls/consentManager.js';
import { syncConsentManager } from '../syncConsentManager.js';

const client = {} as GraphQLClient;

describe('syncConsentManager reportOnly', () => {
  beforeEach(() => {
    vi.mocked(makeGraphQLRequest).mockClear();
  });

  it('sends off: true when reportOnly is true', async () => {
    await syncConsentManager(client, { reportOnly: true });

    expect(makeGraphQLRequest).toHaveBeenCalledWith(
      client,
      TOGGLE_CONSENT_MANAGER_ENFORCEMENT,
      expect.objectContaining({
        variables: {
          input: {
            id: 'bundle-1',
            off: true,
          },
        },
      }),
    );
  });

  it('sends off: false when reportOnly is false', async () => {
    await syncConsentManager(client, { reportOnly: false });

    expect(makeGraphQLRequest).toHaveBeenCalledWith(
      client,
      TOGGLE_CONSENT_MANAGER_ENFORCEMENT,
      expect.objectContaining({
        variables: {
          input: {
            id: 'bundle-1',
            off: false,
          },
        },
      }),
    );
  });

  it('does not toggle enforcement when reportOnly is omitted', async () => {
    await syncConsentManager(client, { domains: ['example.com'] });

    const enforcementCall = vi
      .mocked(makeGraphQLRequest)
      .mock.calls.find(([, query]) => query === TOGGLE_CONSENT_MANAGER_ENFORCEMENT);
    expect(enforcementCall).toBeUndefined();
  });
});

describe('syncConsentManager deployment webhook', () => {
  beforeEach(() => {
    vi.mocked(makeGraphQLRequest).mockClear();
    mockLogger.info.mockClear();
    mockLogger.debug.mockClear();
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

  it('does not log webhook header secret values', async () => {
    const secret = 'super-secret-token';
    await syncConsentManager(
      client,
      {
        webhookUrl: 'https://example.com/hook',
        webhookHeaders: [{ name: 'x-transcend-token', value: secret, isSecret: true }],
      },
      { logger: mockLogger },
    );

    const logged = [...mockLogger.info.mock.calls, ...mockLogger.debug.mock.calls]
      .flat()
      .join('\n');
    expect(logged).not.toContain(secret);
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Successfully synced consent manager deployment webhook',
    );
  });
});
