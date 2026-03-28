import { makeGraphQLRequest } from '@transcend-io/sdk';
import { map } from '@transcend-io/utils';
import colors from 'colors';
import { GraphQLClient } from 'graphql-request';
import { keyBy, difference, groupBy } from 'lodash-es';

import { AttributeInput } from '../../codecs.js';
import { logger } from '../../logger.js';
import { Attribute } from './fetchAllAttributes.js';
import {
  CREATE_ATTRIBUTE,
  CREATE_ATTRIBUTE_VALUES,
  DELETE_ATTRIBUTE_VALUE,
  UPDATE_ATTRIBUTE,
  UPDATE_ATTRIBUTE_VALUES,
} from './gqls/index.js';

/**
 * Sync attribute
 *
 * @param client - GraphQL client
 * @param attribute - The attribute input
 * @param options - Options
 */
export async function syncAttribute(
  client: GraphQLClient,
  attribute: AttributeInput,
  {
    existingAttribute,
    deleteExtraAttributeValues,
  }: {
    /** The existing attribute configuration if it exists */
    existingAttribute?: Attribute;
    /** When true, delete extra attributes not specified in the list of values */
    deleteExtraAttributeValues?: boolean;
  },
): Promise<void> {
  // attribute key input
  const input = {
    name: attribute.name,
    enabledOn: attribute.resources,
  };

  // create or update attribute key
  let attributeKeyId: string;
  if (!existingAttribute) {
    const {
      createAttributeKey: { attributeKey },
    } = await makeGraphQLRequest<{
      /** Create attribute key response */
      createAttributeKey: {
        /** Attribute key */
        attributeKey: {
          /** ID */
          id: string;
        };
      };
    }>(client, CREATE_ATTRIBUTE, {
      variables: {
        type: attribute.type,
        description: attribute.description,
        ...input,
      },
      logger,
    });
    attributeKeyId = attributeKey.id;
  } else {
    await makeGraphQLRequest(client, UPDATE_ATTRIBUTE, {
      variables: {
        attributeKeyId: existingAttribute.id,
        description: existingAttribute.isCustom ? attribute.description : undefined,
        ...input,
      },
      logger,
    });
    attributeKeyId = existingAttribute.id;
  }

  // upsert attribute values
  const existingAttributeMap = keyBy(existingAttribute?.values || [], 'name');
  const { existingValues = [], newValues = [] } = groupBy(attribute.values || [], (field) =>
    existingAttributeMap[field.name] ? 'existingValues' : 'newValues',
  );
  const removedValues = difference(
    (existingAttribute?.values || []).map(({ name }) => name),
    (attribute.values || []).map(({ name }) => name),
  );

  // Create new attribute values
  if (newValues.length > 0) {
    await makeGraphQLRequest(client, CREATE_ATTRIBUTE_VALUES, {
      variables: {
        input: newValues.map(({ name, ...rest }) => ({
          name,
          attributeKeyId,
          ...rest,
        })),
      },
      logger,
    });
    logger.info(colors.green(`Created ${newValues.length} attribute values`));
  }

  // Update existing attribute values
  if (existingValues.length > 0) {
    await makeGraphQLRequest(client, UPDATE_ATTRIBUTE_VALUES, {
      variables: {
        input: existingValues.map(({ name, ...rest }) => ({
          id: existingAttributeMap[name].id,
          name,
          description: existingAttributeMap[name].description,
          color: existingAttributeMap[name].color,
          ...rest,
          attributeKeyId,
        })),
      },
      logger,
    });
    logger.info(colors.green(`Updated ${existingValues.length} attribute values`));
  }

  // Delete removed attribute values
  if (removedValues.length > 0 && deleteExtraAttributeValues) {
    await map(
      removedValues,
      async (value) => {
        await makeGraphQLRequest(client, DELETE_ATTRIBUTE_VALUE, {
          variables: { id: existingAttributeMap[value].id },
          logger,
        });
      },
      {
        concurrency: 10,
      },
    );
    logger.info(colors.green(`Deleted ${removedValues.length} attribute values`));
  }
}
