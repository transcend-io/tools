import { IsoCountryCode, IsoCountrySubdivisionCode } from '@transcend-io/privacy-types';
import { mapSeries, type Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';
import { keyBy, chunk } from 'lodash-es';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { fetchAllBusinessEntities, BusinessEntity } from './fetchAllBusinessEntities.js';
import { UPDATE_BUSINESS_ENTITIES, CREATE_BUSINESS_ENTITY } from './gqls/businessEntity.js';

export interface BusinessEntityInput {
  /** Display title of the business entity */
  title: string;
  /** Description of the business entity */
  description?: string;
  /** Physical address */
  address?: string;
  /** Headquarters country */
  headquarterCountry?: IsoCountryCode;
  /** Headquarters country subdivision */
  headquarterSubDivision?: IsoCountrySubdivisionCode;
  /** Name of the data protection officer */
  dataProtectionOfficerName?: string;
  /** Email of the data protection officer */
  dataProtectionOfficerEmail?: string;
  /** Custom attribute values to assign */
  attributes?: {
    /** Attribute key name */
    key: string;
    /** Attribute values */
    values: string[];
  }[];
  /** Team names to assign */
  teams?: string[];
  /** Owner email addresses to assign */
  owners?: string[];
}

/**
 * Input to create a new business entity
 *
 * @param client - GraphQL client
 * @param businessEntity - Input
 * @returns Created business entity
 */
export async function createBusinessEntity(
  client: GraphQLClient,
  businessEntity: BusinessEntityInput,
  options: {
    /** Logger instance */
    logger: Logger;
  },
): Promise<BusinessEntity> {
  const { logger } = options;
  const input = {
    title: businessEntity.title,
    description: businessEntity.description,
    address: businessEntity.address,
    headquarterCountry: businessEntity.headquarterCountry,
    headquarterSubDivision: businessEntity.headquarterSubDivision,
    dataProtectionOfficerName: businessEntity.dataProtectionOfficerName,
    dataProtectionOfficerEmail: businessEntity.dataProtectionOfficerEmail,
    attributes: businessEntity.attributes,
    teamNames: businessEntity.teams,
    ownerEmails: businessEntity.owners,
  };

  const { createBusinessEntity } = await makeGraphQLRequest<{
    /** Create business entity mutation */
    createBusinessEntity: {
      /** Created business entity */
      businessEntity: BusinessEntity;
    };
  }>(client, CREATE_BUSINESS_ENTITY, {
    variables: { input },
    logger,
  });
  return createBusinessEntity.businessEntity;
}

/**
 * Input to update business entities
 *
 * @param client - GraphQL client
 * @param businessEntityIdParis - [BusinessEntityInput, businessEntityId] list
 */
export async function updateBusinessEntities(
  client: GraphQLClient,
  businessEntityIdParis: [BusinessEntityInput, string][],
  options: {
    /** Logger instance */
    logger: Logger;
  },
): Promise<void> {
  const { logger } = options;
  const chunkedUpdates = chunk(businessEntityIdParis, 100);
  await mapSeries(chunkedUpdates, async (chunked) => {
    await makeGraphQLRequest(client, UPDATE_BUSINESS_ENTITIES, {
      variables: {
        input: chunked.map(([businessEntity, id]) => ({
          id,
          title: businessEntity.title,
          description: businessEntity.description,
          address: businessEntity.address,
          headquarterCountry: businessEntity.headquarterCountry,
          headquarterSubDivision: businessEntity.headquarterSubDivision,
          dataProtectionOfficerName: businessEntity.dataProtectionOfficerName,
          dataProtectionOfficerEmail: businessEntity.dataProtectionOfficerEmail,
          attributes: businessEntity.attributes,
          teamNames: businessEntity.teams,
          ownerEmails: businessEntity.owners,
        })),
      },
      logger,
    });
  });
}

/**
 * Sync the data inventory business entities
 *
 * @param client - GraphQL client
 * @param inputs - Inputs to create
 * @returns True if run without error, returns false if an error occurred
 */
export async function syncBusinessEntities(
  client: GraphQLClient,
  inputs: BusinessEntityInput[],
  options: {
    /** Logger instance */
    logger: Logger;
  },
): Promise<boolean> {
  const { logger } = options;
  // Fetch existing
  logger.info(`Syncing "${inputs.length}" business entities...`);

  let encounteredError = false;

  // Fetch existing
  const existingBusinessEntities = await fetchAllBusinessEntities(client, { logger });

  // Look up by title
  const businessEntityByTitle = keyBy(existingBusinessEntities, 'title');

  // Create new business entities
  const newBusinessEntities = inputs.filter((input) => !businessEntityByTitle[input.title]);

  // Create new business entities
  await mapSeries(newBusinessEntities, async (businessEntity) => {
    try {
      const newBusinessEntity = await createBusinessEntity(client, businessEntity, { logger });
      businessEntityByTitle[newBusinessEntity.title] = newBusinessEntity;
      logger.info(`Successfully synced business entity "${businessEntity.title}"!`);
    } catch (err) {
      encounteredError = true;
      logger.info(
        `Failed to sync business entity "${businessEntity.title}"! - ${(err as Error).message}`,
      );
    }
  });

  // Update all business entities
  try {
    logger.info(`Updating "${inputs.length}" business entities!`);
    await updateBusinessEntities(
      client,
      inputs.map((input) => [input, businessEntityByTitle[input.title]!.id]),
      { logger },
    );
    logger.info(`Successfully synced "${inputs.length}" business entities!`);
  } catch (err) {
    encounteredError = true;
    logger.info(
      `Failed to sync "${inputs.length}" business entities ! - ${(err as Error).message}`,
    );
  }

  return !encounteredError;
}
