import { afterEach, describe, expect, it, vi } from 'vitest';

import type { TranscendGraphQLBase } from '../src/clients/graphql/base.js';
import {
  resolveSombraUrl,
  readSombraEnvConfig,
  resolveSombraHostUrl,
  SOMBRA_CUSTOMER_KEY_ENV,
  SOMBRA_REVERSE_TUNNEL_URLS,
  SOMBRA_URL_ENV,
} from '../src/server/resolve-sombra-url.js';

describe('resolveSombraUrl', () => {
  it('uses sticky SOMBRA_URL override without requiring customerUrl', () => {
    expect(
      resolveSombraUrl({
        sombraUrlOverride: 'https://sombra.example.com/',
        customerUrl: null,
      }),
    ).toBe('https://sombra.example.com');
  });

  it('uses customerUrl when override is unset', () => {
    expect(
      resolveSombraUrl({
        customerUrl: 'https://customer.sombra.example.com/',
      }),
    ).toBe('https://customer.sombra.example.com');
  });

  it('throws an actionable error when customerUrl is missing', () => {
    expect(() =>
      resolveSombraUrl({
        customerUrl: null,
      }),
    ).toThrow(/does not have a Sombra customer URL/);
  });

  it('throws when customerUrl is a reverse-tunnel placeholder', () => {
    expect(() =>
      resolveSombraUrl({
        customerUrl: SOMBRA_REVERSE_TUNNEL_URLS[0],
      }),
    ).toThrow(/customer ingress URL has not been set up/);
  });

  it('allows override even when customerUrl would be a reverse tunnel', () => {
    expect(
      resolveSombraUrl({
        sombraUrlOverride: 'https://self-hosted.example.com',
        customerUrl: SOMBRA_REVERSE_TUNNEL_URLS[0],
      }),
    ).toBe('https://self-hosted.example.com');
  });
});

describe('resolveSombraHostUrl', () => {
  it('uses override without GraphQL', async () => {
    const makeRequest = vi.fn();
    const graphql = { makeRequest } as unknown as TranscendGraphQLBase;

    await expect(
      resolveSombraHostUrl(graphql, {
        sombraUrlOverride: 'https://override.example.com/',
      }),
    ).resolves.toBe('https://override.example.com');
    expect(makeRequest).not.toHaveBeenCalled();
  });

  it('fetches customerUrl when override is unset', async () => {
    const makeRequest = vi.fn().mockResolvedValue({
      organization: {
        sombra: { customerUrl: 'https://from-gql.example.com/' },
      },
    });
    const graphql = { makeRequest } as unknown as TranscendGraphQLBase;

    await expect(resolveSombraHostUrl(graphql)).resolves.toBe('https://from-gql.example.com');
    expect(makeRequest).toHaveBeenCalledTimes(1);
  });
});

describe('readSombraEnvConfig', () => {
  const originalUrl = process.env[SOMBRA_URL_ENV];
  const originalKey = process.env[SOMBRA_CUSTOMER_KEY_ENV];

  afterEach(() => {
    if (originalUrl === undefined) delete process.env[SOMBRA_URL_ENV];
    else process.env[SOMBRA_URL_ENV] = originalUrl;
    if (originalKey === undefined) delete process.env[SOMBRA_CUSTOMER_KEY_ENV];
    else process.env[SOMBRA_CUSTOMER_KEY_ENV] = originalKey;
  });

  it('reads trimmed SOMBRA_URL and SOMBRA_CUSTOMER_KEY', () => {
    process.env[SOMBRA_URL_ENV] = '  https://sombra.example.com  ';
    process.env[SOMBRA_CUSTOMER_KEY_ENV] = '  key-123  ';
    expect(readSombraEnvConfig()).toEqual({
      sombraUrl: 'https://sombra.example.com',
      sombraCustomerKey: 'key-123',
    });
  });

  it('returns undefined fields when env is unset', () => {
    delete process.env[SOMBRA_URL_ENV];
    delete process.env[SOMBRA_CUSTOMER_KEY_ENV];
    expect(readSombraEnvConfig()).toEqual({
      sombraUrl: undefined,
      sombraCustomerKey: undefined,
    });
  });
});
