import { UiVariantStatus, type ConsentVariantInput } from '@transcend-io/privacy-types';
import type { GraphQLClient } from 'graphql-request';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../api/makeGraphQLRequest.js', () => ({
  makeGraphQLRequest: vi.fn(async () => ({
    createConsentUiVariant: { consentUiVariant: { id: 'created-1' } },
  })),
  NOOP_LOGGER: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../fetchConsentVariants.js', () => ({
  fetchConsentVariants: vi.fn(),
}));

import { makeGraphQLRequest } from '../../api/makeGraphQLRequest.js';
import { fetchConsentVariants, type ConsentUiVariant } from '../fetchConsentVariants.js';
import { CREATE_CONSENT_UI_VARIANT, UPDATE_CONSENT_UI_VARIANT } from '../gqls/consentManager.js';
import { syncConsentUiVariants } from '../syncConsentUi.js';

const client = {} as GraphQLClient;
const airgapBundleId = 'bundle-1';

const baseYamlVariant = {
  id: 'variant-1',
  name: 'Custom Banner',
  slug: 'custom-banner',
  status: UiVariantStatus.Draft,
  locales: ['en'] as ConsentVariantInput['locales'],
  configuration: '{}',
};

const remoteVariant = {
  id: 'remote-1',
  name: 'Custom Banner',
  slug: 'custom-banner',
  locales: ['en'],
  configuration: {} as ConsentUiVariant['configuration'],
  status: UiVariantStatus.Draft,
} satisfies ConsentUiVariant;

describe('syncConsentUiVariants description handling', () => {
  beforeEach(() => {
    vi.mocked(makeGraphQLRequest).mockClear();
    vi.mocked(fetchConsentVariants).mockReset();
  });

  it('omits description on update when yaml has no description (leave unset)', async () => {
    vi.mocked(fetchConsentVariants).mockResolvedValue([{ ...remoteVariant, description: null }]);

    await syncConsentUiVariants(client, airgapBundleId, [baseYamlVariant], []);

    expect(makeGraphQLRequest).toHaveBeenCalledWith(
      client,
      UPDATE_CONSENT_UI_VARIANT,
      expect.objectContaining({
        variables: {
          input: expect.not.objectContaining({
            description: expect.anything(),
          }),
        },
      }),
    );

    const updateCall = vi
      .mocked(makeGraphQLRequest)
      .mock.calls.find(([, query]) => query === UPDATE_CONSENT_UI_VARIANT);
    expect(updateCall?.[2]?.variables?.input).not.toHaveProperty('description');
  });

  it('includes description on update when yaml provides a string', async () => {
    vi.mocked(fetchConsentVariants).mockResolvedValue([remoteVariant]);

    await syncConsentUiVariants(
      client,
      airgapBundleId,
      [{ ...baseYamlVariant, description: 'A custom banner' }],
      [],
    );

    expect(makeGraphQLRequest).toHaveBeenCalledWith(
      client,
      UPDATE_CONSENT_UI_VARIANT,
      expect.objectContaining({
        variables: {
          input: expect.objectContaining({
            description: 'A custom banner',
          }),
        },
      }),
    );
  });

  it('omits description on create when yaml has no description', async () => {
    vi.mocked(fetchConsentVariants).mockResolvedValue([]);

    await syncConsentUiVariants(client, airgapBundleId, [baseYamlVariant], []);

    const createCall = vi
      .mocked(makeGraphQLRequest)
      .mock.calls.find(([, query]) => query === CREATE_CONSENT_UI_VARIANT);
    expect(createCall?.[2]?.variables?.input).not.toHaveProperty('description');
  });
});
