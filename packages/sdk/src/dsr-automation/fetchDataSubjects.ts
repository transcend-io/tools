import { RequestActionObjectResolver } from '@transcend-io/privacy-types';
import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { CREATE_DATA_SUBJECT, DATA_SUBJECTS } from './gqls/dataSubject.js';

export interface DataSubject {
  /** ID of data subject */
  id: string;
  /** Type of data subject */
  type: string;
  /** Whether active */
  active: boolean;
  /** Title of data subject */
  title: {
    /** Default message */
    defaultMessage: string;
  };
  /** Whether silent mode is enabled by default */
  adminDashboardDefaultSilentMode: boolean;
  /** Enabled actions */
  actions: {
    /** Type of action */
    type: RequestActionObjectResolver;
  }[];
}

/**
 * Fetch all data subjects in an organization
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns List of data subject configurations
 */
export async function fetchAllDataSubjects(
  client: GraphQLClient,
  options: {
    /** Logger instance */
    logger: Logger;
  },
): Promise<DataSubject[]> {
  const { logger } = options;
  const { internalSubjects } = await makeGraphQLRequest<{
    /** Query response */
    internalSubjects: DataSubject[];
  }>(client, DATA_SUBJECTS, { logger });
  return internalSubjects;
}

/**
 * Create a single data subject
 *
 * @param client - GraphQL client
 * @param dataSubjectType - The type string for the new subject
 * @param options - Options
 * @returns Created data subject
 */
export async function createDataSubject(
  client: GraphQLClient,
  dataSubjectType: string,
  options: {
    /** Logger instance */
    logger: Logger;
  },
): Promise<DataSubject> {
  const { logger } = options;
  const { createSubject } = await makeGraphQLRequest<{
    /** Create Subject Response */
    createSubject: {
      /** Created Data Subject */
      subject: DataSubject;
    };
  }>(client, CREATE_DATA_SUBJECT, {
    variables: { type: dataSubjectType, skipPublish: true },
    logger,
  });
  return createSubject.subject;
}

/**
 * Convert a list of data subject types into the block list of IDs to assign to the data silo
 *
 * @param dataSubjectTypes - The list of data subject types that the data silo should be for
 * @param allDataSubjects - All data subjects in the organization
 * @returns The block list of data subject ids to not process against this data silo
 */
export function convertToDataSubjectBlockList(
  dataSubjectTypes: string[],
  allDataSubjects: { [type in string]: DataSubject },
): string[] {
  dataSubjectTypes.forEach((type) => {
    if (!allDataSubjects[type]) {
      throw new Error(`Expected to find data subject definition: ${type}`);
    }
  });

  return Object.values(allDataSubjects)
    .filter((silo) => !dataSubjectTypes.includes(silo.type))
    .map(({ id }) => id);
}

/**
 * Convert a list of data subject types into the allow list of types
 *
 * @param dataSubjectTypes - The list of data subject types that the data silo should be for
 * @param allDataSubjects - All data subjects in the organization
 * @returns The allow list of data subjects for that silo
 */
export function convertToDataSubjectAllowlist(
  dataSubjectTypes: string[],
  allDataSubjects: { [type in string]: DataSubject },
): string[] {
  dataSubjectTypes.forEach((type) => {
    if (!allDataSubjects[type]) {
      throw new Error(`Expected to find data subject definition: ${type}`);
    }
  });

  return Object.values(allDataSubjects)
    .filter((silo) => !dataSubjectTypes.includes(silo.type))
    .map(({ type }) => type);
}
