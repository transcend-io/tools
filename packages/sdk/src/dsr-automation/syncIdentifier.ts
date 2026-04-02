import { RequestAction } from '@transcend-io/privacy-types';
import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import type { DataSubject } from './fetchDataSubjects.js';
import { UPDATE_IDENTIFIER } from './gqls/dsrIdentifier.js';

export interface IdentifierInput {
  /** The name of the identifier */
  name: string;
  /** The type of the identifier */
  type: string;
  /** Regular expression to verify the identifier */
  regex?: string;
  /** The fixed set of options that an identifier can take on */
  selectOptions?: string[];
  /** Whether or not the identifier is shown in the privacy center form */
  privacyCenterVisibility?: RequestAction[];
  /** The set of data subjects that this identifier is enabled for */
  dataSubjects?: string[];
  /** When true, the identifier is a required field on the privacy center form */
  isRequiredInForm?: boolean;
  /** Placeholder message for identifier */
  placeholder?: string;
  /** Display title for identifier */
  displayTitle?: string;
  /** Display description for identifier */
  displayDescription?: string;
  /** The display order for the identifier */
  displayOrder?: number;
  /** Whether or not the identifier is unique on the preference store */
  isUniqueOnPreferenceStore?: boolean;
}

/**
 * Sync a single identifier
 *
 * @param client - GraphQL client
 * @param options - Options
 */
export async function syncIdentifier(
  client: GraphQLClient,
  options: {
    /** Identifier update input */
    identifier: IdentifierInput;
    /** Data subject lookup by name */
    dataSubjectsByName: { [k in string]: DataSubject };
    /** Existing identifier Id */
    identifierId: string;
    /** When true, skip publishing to privacy center */
    skipPublish?: boolean;
    /** Logger instance */
    logger: Logger;
  },
): Promise<void> {
  const { identifier, dataSubjectsByName, identifierId, skipPublish = false, logger } = options;
  await makeGraphQLRequest(client, UPDATE_IDENTIFIER, {
    variables: {
      input: {
        id: identifierId,
        selectOptions: identifier.selectOptions,
        isRequiredInForm: identifier.isRequiredInForm,
        regex: identifier.regex,
        placeholder: identifier.placeholder,
        displayTitle: identifier.displayTitle,
        displayDescription: identifier.displayDescription,
        displayOrder: identifier.displayOrder,
        isUniqueOnPreferenceStore: identifier.isUniqueOnPreferenceStore,
        privacyCenterVisibility: identifier.privacyCenterVisibility,
        dataSubjectIds: identifier.dataSubjects
          ? identifier.dataSubjects.map((type) => dataSubjectsByName[type]!.id)
          : undefined,
        skipPublish,
      },
    },
    logger,
  });
}
