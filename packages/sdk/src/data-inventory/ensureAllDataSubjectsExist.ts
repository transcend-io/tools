import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';
import { keyBy, difference, uniq } from 'lodash-es';

import { NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
import {
  fetchAllDataSubjects,
  createDataSubject,
  type DataSubject,
} from '../dsr-automation/fetchDataSubjects.js';

/**
 * SDK-friendly input describing which data subject types are expected.
 * Each array field contains arrays of data subject type strings from different sources.
 */
export interface EnsureDataSubjectsInput {
  /** Data subject type arrays from data silos (one array per silo) */
  dataSiloDataSubjects?: string[][];
  /** Data subject type arrays from processing activities (one array per activity) */
  processingActivityDataSubjects?: string[][];
  /** Data subject type arrays from enrichers (one array per enricher) */
  enricherDataSubjects?: string[][];
  /** Data subject types defined directly */
  dataSubjectTypes?: string[];
}

/**
 * Ensure all referenced data subjects exist, creating any missing ones.
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns Map from data subject type to DataSubject
 */
export async function ensureAllDataSubjectsExist(
  client: GraphQLClient,
  options: {
    /** Input describing expected data subject types */
    input: EnsureDataSubjectsInput;
    /** When true, always fetch all subjects even if none are expected */
    fetchAll?: boolean;
    /** Logger instance */
    logger?: Logger;
  },
): Promise<Record<string, DataSubject>> {
  const { input, fetchAll = false, logger = NOOP_LOGGER } = options;

  const expectedDataSubjects = uniq([
    ...(input.dataSiloDataSubjects ?? []).flat(),
    ...(input.processingActivityDataSubjects ?? []).flat(),
    ...(input.enricherDataSubjects ?? []).flat(),
    ...(input.dataSubjectTypes ?? []),
  ]);

  if (expectedDataSubjects.length === 0 && !fetchAll) {
    return {};
  }

  const internalSubjects = await fetchAllDataSubjects(client, { logger });
  const dataSubjectByName = keyBy(internalSubjects, 'type');

  const missingDataSubjects = difference(
    expectedDataSubjects,
    internalSubjects.map(({ type }) => type),
  );

  if (missingDataSubjects.length > 0) {
    logger.info(`Creating ${missingDataSubjects.length} new data subjects...`);
    for (const dataSubjectType of missingDataSubjects) {
      logger.info(`Creating data subject ${dataSubjectType}...`);
      const created = await createDataSubject(client, {
        input: dataSubjectType,
        logger,
      });
      logger.info(`Created data subject ${dataSubjectType}!`);
      dataSubjectByName[dataSubjectType] = created;
    }
  }

  return dataSubjectByName;
}
