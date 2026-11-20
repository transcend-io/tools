import { mapSeries, type Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';
import { chunk } from 'lodash-es';

import { makeGraphQLRequest, NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
import { fetchConsentManagerId } from './fetchConsentManagerId.js';
import { CREATE_OR_UPDATE_CONSENT_SITES } from './gqls/consentSites.js';

/** Input to define a consent site for sync */
export interface ConsentSiteInput {
  /** The host of the site (e.g. app.example.com) */
  host: string;
  /** The eTLD+1 of the host. Inferred from the host when not provided. */
  site?: string;
  /** Description of the site */
  description?: string;
  /** Email addresses of owners */
  owners?: string[];
  /** Names of teams responsible for managing this site */
  teams?: string[];
  /** Attribute key-value pairs */
  attributes?: {
    /** Attribute key */
    key: string;
    /** Attribute values */
    values: string[];
  }[];
}

const MAX_PAGE_SIZE = 100;

/**
 * Sync the set of consent sites into the product
 *
 * @param client - GraphQL client
 * @param consentSites - Consent sites to sync
 * @param options - Options
 * @returns True upon success, false upon failure
 */
export async function syncConsentSites(
  client: GraphQLClient,
  consentSites: ConsentSiteInput[],
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<boolean> {
  const { logger = NOOP_LOGGER } = options;
  logger.info(`Syncing "${consentSites.length}" consent sites...`);

  const hosts = consentSites.map(({ host }) => host);
  const notUnique = hosts.filter((host, index) => hosts.indexOf(host) !== index);
  if (notUnique.length > 0) {
    throw new Error(
      `Failed to upload consent sites as there were non-unique hosts found: ${[
        ...new Set(notUnique),
      ].join(',')}`,
    );
  }

  try {
    const airgapBundleId = await fetchConsentManagerId(client, { logger });
    await mapSeries(chunk(consentSites, MAX_PAGE_SIZE), async (page) => {
      await makeGraphQLRequest(client, CREATE_OR_UPDATE_CONSENT_SITES, {
        variables: {
          airgapBundleId,
          sites: page.map((site) => ({
            host: site.host,
            site: site.site,
            description: site.description,
            ownerEmails: site.owners,
            teamNames: site.teams,
            attributes: site.attributes,
          })),
        },
        logger,
      });
    });
    logger.info(`Successfully synced ${consentSites.length} consent sites!`);
    return true;
  } catch (err) {
    logger.error(`Failed to sync consent sites! - ${(err as Error).message}`);
    return false;
  }
}
