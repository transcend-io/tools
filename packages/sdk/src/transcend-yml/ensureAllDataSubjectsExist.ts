import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';
import { keyBy, flatten, uniq, difference } from 'lodash-es';

import {
  NOOP_LOGGER,
  createDataSubject,
  fetchAllDataSubjects,
  type DataSubject,
} from '../index.js';
import { TranscendInput } from './codecs.js';

/**
 * Fetch all of the data subjects in the organization
 *
 * @param input - Input to fetch
 * @param client - GraphQL client
 * @param fetchAll - When true, always fetch all subjects
 * @param options - Optional logger
 * @returns The list of data subjects
 */
export async function ensureAllDataSubjectsExist(
  {
    'data-silos': dataSilos = [],
    'data-subjects': dataSubjects = [],
    'processing-activities': processingActivities = [],
    preflights = [],
  }: TranscendInput,
  client: GraphQLClient,
  fetchAll = false,
  {
    logger = NOOP_LOGGER,
  }: {
    /** Logger for progress messages */
    logger?: Logger;
  } = {},
): Promise<{ [type in string]: DataSubject }> {
  const expectedDataSubjects = uniq([
    ...flatten(dataSilos.map((silo) => silo['data-subjects'] || []) || []),
    ...flatten(processingActivities.map(({ dataSubjectTypes }) => dataSubjectTypes ?? []) ?? []),
    ...flatten(preflights.map((preflight) => preflight['data-subjects'] || []) || []),
    ...dataSubjects.map((subject) => subject.type),
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
      const created = await createDataSubject(client, { input: dataSubjectType, logger });
      logger.info(`Created data subject ${dataSubjectType}!`);
      dataSubjectByName[dataSubjectType] = created;
    }
  }

  return dataSubjectByName;
}
