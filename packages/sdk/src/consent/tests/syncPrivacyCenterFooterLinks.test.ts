import type { GraphQLClient } from 'graphql-request';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../api/makeGraphQLRequest.js', () => ({
  makeGraphQLRequest: vi.fn(async () => ({})),
  NOOP_LOGGER: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { makeGraphQLRequest } from '../../api/makeGraphQLRequest.js';
import {
  DELETE_PRIVACY_CENTER_FOOTER_LINKS,
  UPDATE_PRIVACY_CENTER_FOOTER_LINKS,
} from '../gqls/privacyCenter.js';
import { syncPrivacyCenterFooterLinks } from '../syncPrivacyCenterFooterLinks.js';

const client = {} as GraphQLClient;
const privacyCenterId = 'pc-1';

const existingFooterLinks = [
  {
    id: 'link-1',
    displayOrder: 0,
    title: { defaultMessage: 'Privacy Policy' },
    url: { defaultMessage: 'https://example.com/privacy' },
  },
  {
    id: 'link-2',
    displayOrder: 1,
    title: { defaultMessage: 'Terms' },
    url: { defaultMessage: 'https://example.com/terms' },
  },
];

describe('syncPrivacyCenterFooterLinks', () => {
  beforeEach(() => {
    vi.mocked(makeGraphQLRequest).mockClear();
  });

  it('upserts links matched by title and deletes omitted links', async () => {
    await syncPrivacyCenterFooterLinks(
      client,
      privacyCenterId,
      [
        {
          title: 'Privacy Policy',
          url: 'https://example.com/privacy-updated',
        },
        {
          title: 'Cookie Policy',
          url: 'https://example.com/cookies',
        },
      ],
      existingFooterLinks,
    );

    expect(makeGraphQLRequest).toHaveBeenCalledWith(
      client,
      DELETE_PRIVACY_CENTER_FOOTER_LINKS,
      expect.objectContaining({
        variables: {
          input: {
            privacyCenterId,
            ids: ['link-2'],
          },
        },
      }),
    );

    expect(makeGraphQLRequest).toHaveBeenCalledWith(
      client,
      UPDATE_PRIVACY_CENTER_FOOTER_LINKS,
      expect.objectContaining({
        variables: {
          input: {
            privacyCenterId,
            footerLinks: [
              {
                id: 'link-1',
                title: 'Privacy Policy',
                url: 'https://example.com/privacy-updated',
              },
              {
                id: undefined,
                title: 'Cookie Policy',
                url: 'https://example.com/cookies',
              },
            ],
          },
        },
      }),
    );
  });

  it('matches by explicit id when provided', async () => {
    await syncPrivacyCenterFooterLinks(
      client,
      privacyCenterId,
      [
        {
          id: 'link-2',
          title: 'Terms of Use',
          url: 'https://example.com/terms-updated',
        },
      ],
      existingFooterLinks,
    );

    expect(makeGraphQLRequest).toHaveBeenCalledWith(
      client,
      DELETE_PRIVACY_CENTER_FOOTER_LINKS,
      expect.objectContaining({
        variables: {
          input: {
            privacyCenterId,
            ids: ['link-1'],
          },
        },
      }),
    );

    expect(makeGraphQLRequest).toHaveBeenCalledWith(
      client,
      UPDATE_PRIVACY_CENTER_FOOTER_LINKS,
      expect.objectContaining({
        variables: {
          input: {
            privacyCenterId,
            footerLinks: [
              {
                id: 'link-2',
                title: 'Terms of Use',
                url: 'https://example.com/terms-updated',
              },
            ],
          },
        },
      }),
    );
  });

  it('throws when footer link titles are not unique', async () => {
    await expect(
      syncPrivacyCenterFooterLinks(
        client,
        privacyCenterId,
        [
          { title: 'Privacy Policy', url: 'https://example.com/a' },
          { title: 'Privacy Policy', url: 'https://example.com/b' },
        ],
        [],
      ),
    ).rejects.toThrow(/non-unique titles/);
  });

  it('deletes all existing links when an empty list is provided', async () => {
    await syncPrivacyCenterFooterLinks(client, privacyCenterId, [], existingFooterLinks);

    expect(makeGraphQLRequest).toHaveBeenCalledTimes(1);
    expect(makeGraphQLRequest).toHaveBeenCalledWith(
      client,
      DELETE_PRIVACY_CENTER_FOOTER_LINKS,
      expect.objectContaining({
        variables: {
          input: {
            privacyCenterId,
            ids: ['link-1', 'link-2'],
          },
        },
      }),
    );
  });
});
