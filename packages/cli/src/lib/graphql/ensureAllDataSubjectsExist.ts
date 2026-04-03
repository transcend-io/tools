import { createDataSubject, fetchAllDataSubjects, type DataSubject } from '@transcend-io/sdk';
import colors from 'colors';
import { GraphQLClient } from 'graphql-request';
import { keyBy, flatten, uniq, difference } from 'lodash-es';

import { TranscendInput } from '../../codecs.js';
import { logger } from '../../logger.js';

/**
 * Fetch all of the data subjects in the organization
 *
 * @param input - Input to fetch
 * @param client - GraphQL client
 * @param fetchAll - When true, always fetch all subjects
 * @returns The list of data subjects
 */
export async function ensureAllDataSubjectsExist(
  {
    'data-silos': dataSilos = [],
    'data-subjects': dataSubjects = [],
    'processing-activities': processingActivities = [],
    enrichers = [],
  }: TranscendInput,
  client: GraphQLClient,
  fetchAll = false,
): Promise<{ [type in string]: DataSubject }> {
  const expectedDataSubjects = uniq([
    ...flatten(dataSilos.map((silo) => silo['data-subjects'] || []) || []),
    ...flatten(processingActivities.map(({ dataSubjectTypes }) => dataSubjectTypes ?? []) ?? []),
    ...flatten(enrichers.map((enricher) => enricher['data-subjects'] || []) || []),
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
    logger.info(colors.magenta(`Creating ${missingDataSubjects.length} new data subjects...`));
    for (const dataSubjectType of missingDataSubjects) {
      logger.info(colors.magenta(`Creating data subject ${dataSubjectType}...`));
      const created = await createDataSubject(client, dataSubjectType, { logger });
      logger.info(colors.green(`Created data subject ${dataSubjectType}!`));
      dataSubjectByName[dataSubjectType] = created;
    }
  }

  return dataSubjectByName;
}
