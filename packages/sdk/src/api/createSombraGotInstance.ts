import type { Logger } from '@transcend-io/utils';
import got, { type Got } from 'got';

import { buildTranscendGraphQLClient } from './buildTranscendGraphQLClient.js';
import { ORGANIZATION } from './gqls/organization.js';
import { makeGraphQLRequest } from './makeGraphQLRequest.js';

/**
 * Instantiate an instance of got that is capable of making requests
 * to a sombra gateway.
 *
 * @param transcendUrl - URL of Transcend API
 * @param transcendApiKey - Transcend API key
 * @param options - Additional options
 * @returns The instance of got that is capable of making requests to the customer ingress
 */
export async function createSombraGotInstance(
  transcendUrl: string,
  transcendApiKey: string,
  options: {
    /** Logger instance */
    logger: Logger;
    /** Sombra API key */
    sombraApiKey?: string;
    /** Override Sombra URL (replaces process.env.SOMBRA_URL lookup) */
    sombraUrl?: string;
  },
): Promise<Got> {
  const { logger, sombraApiKey, sombraUrl } = options;

  const client = buildTranscendGraphQLClient(transcendUrl, transcendApiKey);
  const { organization } = await makeGraphQLRequest<{
    /** Organization */
    organization: {
      /** Primary Sombra */
      sombra: {
        /** URL */
        customerUrl: string;
      };
    };
  }>(client, ORGANIZATION, { logger });

  const { customerUrl } = organization.sombra;
  const sombraToUse = sombraUrl || customerUrl;

  if (
    !sombraUrl &&
    [
      'https://sombra-reverse-tunnel.transcend.io',
      'https://sombra-reverse-tunnel.us.transcend.io',
    ].includes(customerUrl)
  ) {
    throw new Error(
      'It looks like your Sombra customer ingress URL has not been set up. ' +
        'Please follow the instructions here to configure networking for Sombra: ' +
        'https://docs.transcend.io/docs/articles/sombra/deploying/customizing-sombra/networking',
    );
  }
  logger.info(`Using sombra: ${sombraToUse}`);

  return got.extend({
    prefixUrl: sombraToUse,
    headers: {
      Authorization: `Bearer ${transcendApiKey}`,
      ...(sombraApiKey ? { 'X-Sombra-Authorization': `Bearer ${sombraApiKey}` } : {}),
    },
  });
}
