import type { Logger } from '@transcend-io/utils';
import type { GraphQLClient } from 'graphql-request';

import { type PreferenceTopic, fetchAllPreferenceTopics } from './fetchAllPreferenceTopics.js';
import { type Purpose, fetchAllPurposes } from './fetchAllPurposes.js';

export interface PurposeWithPreferences extends Purpose {
  /** Topics */
  topics: PreferenceTopic[];
}

/**
 * Fetch all purposes and preferences
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns List of purposes with their preference topics
 */
export async function fetchAllPurposesAndPreferences(
  client: GraphQLClient,
  options: {
    /** Logger instance */
    logger: Logger;
  },
): Promise<PurposeWithPreferences[]> {
  const [purposes, topics] = await Promise.all([
    fetchAllPurposes(client, options),
    fetchAllPreferenceTopics(client, options),
  ]);

  return purposes.map((purpose) => ({
    ...purpose,
    topics: topics.filter((topic) => topic.purpose.trackingType === purpose.trackingType),
  }));
}
