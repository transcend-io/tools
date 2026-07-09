import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';
import { keyBy } from 'lodash-es';

import { makeGraphQLRequest, NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
import type { PrivacyCenterFooterLink } from './fetchAllPrivacyCenters.js';
import {
  DELETE_PRIVACY_CENTER_FOOTER_LINKS,
  UPDATE_PRIVACY_CENTER_FOOTER_LINKS,
} from './gqls/privacyCenter.js';

export interface PrivacyCenterFooterLinkInput {
  /** Existing footer link ID (optional; resolved by title when omitted) */
  id?: string;
  /** Link title (default locale) */
  title: string;
  /** Link URL (default locale) */
  url: string;
}

/**
 * Sync privacy center footer links. Matches existing links by title (or explicit
 * id), upserts the provided list, and deletes any existing links omitted from
 * the YAML.
 *
 * @param client - GraphQL client
 * @param privacyCenterId - Privacy center ID
 * @param footerLinks - Desired footer links
 * @param existingFooterLinks - Existing footer links from the privacy center
 * @param options - Options
 */
export async function syncPrivacyCenterFooterLinks(
  client: GraphQLClient,
  privacyCenterId: string,
  footerLinks: PrivacyCenterFooterLinkInput[],
  existingFooterLinks: PrivacyCenterFooterLink[],
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<void> {
  const { logger = NOOP_LOGGER } = options;

  const notUnique = footerLinks.filter(
    (link) => footerLinks.filter((other) => other.title === link.title).length > 1,
  );
  if (notUnique.length > 0) {
    throw new Error(
      `Failed to sync privacy center footer links as there were non-unique titles: ${[
        ...new Set(notUnique.map(({ title }) => title)),
      ].join(', ')}`,
    );
  }

  const existingById = keyBy(existingFooterLinks, ({ id }) => id);
  const existingByTitle = keyBy(existingFooterLinks, ({ title }) => title.defaultMessage);

  const resolved = footerLinks.map((link) => {
    const byId = link.id ? existingById[link.id] : undefined;
    const byTitle = existingByTitle[link.title];
    return {
      id: byId?.id ?? byTitle?.id,
      title: link.title,
      url: link.url,
    };
  });

  const keptIds = new Set(resolved.map((link) => link.id).filter((id): id is string => !!id));
  const idsToDelete = existingFooterLinks.map(({ id }) => id).filter((id) => !keptIds.has(id));

  if (idsToDelete.length > 0) {
    logger.info(`Deleting "${idsToDelete.length}" privacy center footer links...`);
    await makeGraphQLRequest(client, DELETE_PRIVACY_CENTER_FOOTER_LINKS, {
      variables: {
        input: {
          privacyCenterId,
          ids: idsToDelete,
        },
      },
      logger,
    });
  }

  if (resolved.length > 0) {
    logger.info(`Upserting "${resolved.length}" privacy center footer links...`);
    await makeGraphQLRequest(client, UPDATE_PRIVACY_CENTER_FOOTER_LINKS, {
      variables: {
        input: {
          privacyCenterId,
          footerLinks: resolved,
        },
      },
      logger,
    });
  }
}
