import type { GraphQLClient } from 'graphql-request';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../api/makeGraphQLRequest.js', () => ({
  makeGraphQLRequest: vi.fn(async () => ({
    toggleConsentManagerEnforcement: { clientMutationId: '1' },
  })),
  NOOP_LOGGER: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../fetchConsentManagerId.js', () => ({
  fetchConsentManagerId: vi.fn(async () => 'bundle-1'),
}));

import { makeGraphQLRequest } from '../../api/makeGraphQLRequest.js';
import { TOGGLE_CONSENT_MANAGER_ENFORCEMENT } from '../gqls/consentManager.js';
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
