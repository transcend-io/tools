import { IdentifierType, RequestAction } from '@transcend-io/privacy-types';
import type { Logger } from '@transcend-io/utils';
import type { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { IDENTIFIERS } from './gqls/identifier.js';

export interface Identifier {
  /** ID of identifier */
  id: string;
  /** Name of identifier */
  name: string;
  /** The type of identifier */
  type: IdentifierType;
  /** Regular expression */
  regex: string;
  /** The set of options that the identifier supports */
  selectOptions: string[];
  /** Whether identifier is enabled on privacy center */
  privacyCenterVisibility: RequestAction[];
  /** Enabled data subjects that are exposed this identifier on the privacy center */
  dataSubjects: {
    /** type of data subjects */
    type: string;
  }[];
  /** Whether identifier is a required field in privacy center form */
  isRequiredInForm: boolean;
  /** Identifier placeholder text */
  placeholder: string;
  /** Display title for identifier */
  displayTitle: {
    /** Default message */
    defaultMessage: string;
  };
  /** Display description for identifier */
  displayDescription: {
    /** Default */
    defaultMessage: string;
  };
  /** Display order */
  displayOrder: number;
  /** Does this identifier uniquely identify a consent record */
  isUniqueOnPreferenceStore: boolean;
}

const PAGE_SIZE = 20;

/**
 * Fetch all identifiers in the organization
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns All identifiers in the organization
 */
export async function fetchAllIdentifiers(
  client: GraphQLClient,
  options: {
    /** Logger instance */
    logger?: Logger;
  },
): Promise<Identifier[]> {
  const { logger } = options;
  const identifiers: Identifier[] = [];
  let offset = 0;

  let shouldContinue = false;
  do {
    const {
      identifiers: { nodes },
    } = await makeGraphQLRequest<{
      /** Identifiers */
      identifiers: {
        /** List */
        nodes: Identifier[];
      };
    }>(client, IDENTIFIERS, {
      logger,
      variables: { first: PAGE_SIZE, offset },
    });
    identifiers.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return identifiers.sort((a, b) => a.name.localeCompare(b.name));
}
