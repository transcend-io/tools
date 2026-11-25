import type { GraphQLClient } from 'graphql-request';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const makeGraphQLRequest = vi.fn();

vi.mock('../../api/makeGraphQLRequest.js', () => ({
  makeGraphQLRequest: (...args: unknown[]) => makeGraphQLRequest(...args),
}));

import { waitForConsentManagerDeploy } from '../waitForConsentManagerDeploy.js';

const client = {} as GraphQLClient;

const stateResponse = (state: string, deployError: string | null = null) => ({
  consentManager: { consentManager: { state, deployError, lastDeployedAt: null } },
});

describe('waitForConsentManagerDeploy', () => {
  const sleep = vi.fn(() => Promise.resolve());

  beforeEach(() => {
    makeGraphQLRequest.mockReset();
    sleep.mockClear();
  });

  it('polls until the state is no longer pending', async () => {
    makeGraphQLRequest
      .mockResolvedValueOnce(stateResponse('DEPLOY_PENDING'))
      .mockResolvedValueOnce(stateResponse('DEPLOY_PENDING'))
      .mockResolvedValueOnce(stateResponse('DEPLOYED'));

    const state = await waitForConsentManagerDeploy(client, { sleep, pollIntervalMs: 10 });

    expect(state).toBe('DEPLOYED');
    expect(makeGraphQLRequest).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(10);
  });

  it('throws with the deploy error when the deploy fails', async () => {
    makeGraphQLRequest.mockResolvedValueOnce(stateResponse('ERROR', 'bundle build failed'));

    await expect(waitForConsentManagerDeploy(client, { sleep })).rejects.toThrow(
      'Consent manager deploy failed with state ERROR: bundle build failed',
    );
  });

  it('treats TEST_ERROR as a failure', async () => {
    makeGraphQLRequest.mockResolvedValueOnce(stateResponse('TEST_ERROR'));

    await expect(waitForConsentManagerDeploy(client, { sleep })).rejects.toThrow(
      'Consent manager deploy failed with state TEST_ERROR',
    );
  });

  it('times out when the deploy stays pending', async () => {
    makeGraphQLRequest.mockResolvedValue(stateResponse('DEPLOY_PENDING'));
    let time = 0;

    await expect(
      waitForConsentManagerDeploy(client, {
        sleep: () => {
          time += 1000;
          return Promise.resolve();
        },
        now: () => time,
        pollIntervalMs: 1000,
        timeoutMs: 3000,
      }),
    ).rejects.toThrow('Timed out after 3s');
  });
});
