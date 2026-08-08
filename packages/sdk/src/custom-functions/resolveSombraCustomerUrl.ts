import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest, NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
import { ORGANIZATION_SOMBRAS } from './gqls/index.js';

interface SombraPreview {
  /** Sombra ID */
  id: string;
  /** Customer-ingress URL */
  customerUrl: string | null;
}

/**
 * Resolve the customer-ingress URL of a specific Sombra gateway by ID.
 *
 * Used when signing code against a non-primary gateway; the resolved URL is
 * passed as the `sombraUrl` override to `createSombraGotInstance` (which
 * otherwise defaults to the organization's primary Sombra).
 *
 * @param client - GraphQL client authenticated with a Transcend API key
 * @param sombraId - The Sombra gateway ID
 * @param options - Options
 * @returns The customer-ingress URL of that gateway
 */
export async function resolveSombraCustomerUrl(
  client: GraphQLClient,
  sombraId: string,
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<string> {
  const { logger = NOOP_LOGGER } = options;
  const { organization } = await makeGraphQLRequest<{
    /** Organization query response */
    organization: {
      /** Primary Sombra gateway */
      sombra: SombraPreview;
      /** All Sombra gateways in the organization */
      sombras: SombraPreview[];
    };
  }>(client, ORGANIZATION_SOMBRAS, { logger });

  const target = organization.sombras.find(({ id }) => id === sombraId);
  if (!target) {
    throw new Error(`Could not find a Sombra gateway with ID: "${sombraId}"`);
  }
  if (!target.customerUrl) {
    throw new Error(
      `Sombra gateway "${sombraId}" has no customer-ingress URL configured. ` +
        'Please follow the instructions here to configure networking for Sombra: ' +
        'https://docs.transcend.io/docs/articles/sombra/deploying/customizing-sombra/networking',
    );
  }
  return target.customerUrl;
}
