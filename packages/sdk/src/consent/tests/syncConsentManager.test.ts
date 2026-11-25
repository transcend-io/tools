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
import {
  TOGGLE_CONSENT_MANAGER_ENFORCEMENT,
  TOGGLE_UNKNOWN_COOKIE_POLICY,
  TOGGLE_UNKNOWN_REQUEST_POLICY,
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

describe('syncConsentManager unknown policies', () => {
  beforeEach(() => {
    vi.mocked(makeGraphQLRequest).mockClear();
  });

  /**
   * Find the recorded mutation call for a query.
   *
   * @param query - GraphQL document to look for
   * @returns The matching call, if any
   */
  function findCall(query: unknown): unknown[] | undefined {
    return vi.mocked(makeGraphQLRequest).mock.calls.find(([, q]) => q === query);
  }

  it('pushes the cookie policy when only the cookie policy is set', async () => {
    await syncConsentManager(client, { unknownCookiePolicy: 'BLOCK' });

    expect(makeGraphQLRequest).toHaveBeenCalledWith(
      client,
      TOGGLE_UNKNOWN_COOKIE_POLICY,
      expect.objectContaining({
        variables: { input: { id: 'bundle-1', unknownCookiePolicy: 'BLOCK' } },
      }),
    );
    expect(findCall(TOGGLE_UNKNOWN_REQUEST_POLICY)).toBeUndefined();
  });

  it('does not push the cookie policy when only the request policy is set', async () => {
    await syncConsentManager(client, { unknownRequestPolicy: 'ALLOW' });

    expect(makeGraphQLRequest).toHaveBeenCalledWith(
      client,
      TOGGLE_UNKNOWN_REQUEST_POLICY,
      expect.objectContaining({
        variables: { input: { id: 'bundle-1', unknownRequestPolicy: 'ALLOW' } },
      }),
    );
    expect(findCall(TOGGLE_UNKNOWN_COOKIE_POLICY)).toBeUndefined();
  });

  it('pushes both policies when both are set', async () => {
    await syncConsentManager(client, {
      unknownRequestPolicy: 'ALLOW',
      unknownCookiePolicy: 'BLOCK',
    });

    expect(findCall(TOGGLE_UNKNOWN_REQUEST_POLICY)).toBeDefined();
    expect(findCall(TOGGLE_UNKNOWN_COOKIE_POLICY)).toBeDefined();
  });
});
