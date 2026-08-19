import type { Logger } from '@transcend-io/utils';
import got, { type Got } from 'got';

import { buildTranscendGraphQLClient } from './buildTranscendGraphQLClient.js';
import { ORGANIZATION } from './gqls/organization.js';
import { makeGraphQLRequest, NOOP_LOGGER } from './makeGraphQLRequest.js';

/** Preview of a Sombra gateway in the organization */
interface SombraPreview {
  /** Sombra gateway ID */
  id: string;
  /** Customer-ingress URL */
  customerUrl: string | null;
}

const UNCONFIGURED_CUSTOMER_URLS = [
  'https://sombra-reverse-tunnel.transcend.io',
  'https://sombra-reverse-tunnel.us.transcend.io',
];

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
    logger?: Logger;
    /** Sombra API key */
    sombraApiKey?: string;
    /** Override Sombra URL (replaces process.env.SOMBRA_URL lookup) */
    sombraUrl?: string;
    /**
     * Connect to a specific Sombra gateway by ID instead of the
     * organization's primary gateway
     */
    sombraId?: string;
  } = {},
): Promise<Got> {
  const { logger = NOOP_LOGGER, sombraApiKey, sombraUrl, sombraId } = options;

  const client = buildTranscendGraphQLClient(transcendUrl, transcendApiKey);
  const { organization } = await makeGraphQLRequest<{
    /** Organization */
    organization: {
      /** Primary Sombra */
      sombra: SombraPreview;
      /** All Sombra gateways in the organization */
      sombras: SombraPreview[];
    };
  }>(client, ORGANIZATION, { logger });

  let customerUrl: string | null;
  if (sombraId) {
    const target = organization.sombras.find(({ id }) => id === sombraId);
    if (!target) {
      throw new Error(`Could not find a Sombra gateway with ID: "${sombraId}"`);
    }
    customerUrl = target.customerUrl;
  } else {
    customerUrl = organization.sombra.customerUrl;
  }

  const sombraToUse = sombraUrl || customerUrl;

  if (!sombraUrl && (!customerUrl || UNCONFIGURED_CUSTOMER_URLS.includes(customerUrl))) {
    throw new Error(
      `It looks like the customer ingress URL of your Sombra gateway${
        sombraId ? ` "${sombraId}"` : ''
      } has not been set up. ` +
        'Please follow the instructions here to configure networking for Sombra: ' +
        'https://docs.transcend.io/docs/articles/sombra/deploying/customizing-sombra/networking',
    );
  }
  logger.info(`Using sombra: ${sombraToUse}`);

  return (got as unknown as Got).extend({
    prefixUrl: sombraToUse as string,
    headers: {
      Authorization: `Bearer ${transcendApiKey}`,
      ...(sombraApiKey ? { 'X-Sombra-Authorization': `Bearer ${sombraApiKey}` } : {}),
    },
  });
}
