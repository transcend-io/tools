import { AttributeSupportedResourceType } from '@transcend-io/privacy-types';
import { makeGraphQLRequest } from '@transcend-io/sdk';
import { GraphQLClient } from 'graphql-request';

import { logger } from '../../logger.js';
import { SET_RESOURCE_ATTRIBUTES } from './gqls/index.js';

interface SetResourceAttributesInput {
  /** ID of resource */
  resourceId: string;
  /** Type of resource */
  resourceType: AttributeSupportedResourceType;
  /** Attribute key ID */
  attributeKeyId: string;
  /** Attribute values by ID */
  attributeValueIds?: string[];
  /** Attribute values by name */
  attributeValueNames?: string[];
}

/**
 * Set attribute values on a particular resource
 *
 * @param client - GraphQL client
 * @param input - Input
 */
export async function setResourceAttributes(
  client: GraphQLClient,
  input: SetResourceAttributesInput,
): Promise<void> {
  await makeGraphQLRequest(client, SET_RESOURCE_ATTRIBUTES, {
    variables: { input },
    logger,
  });
}
