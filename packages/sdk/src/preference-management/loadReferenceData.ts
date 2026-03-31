import type { Logger } from '@transcend-io/utils';
import type { GraphQLClient } from 'graphql-request';

import { fetchAllIdentifiers, type Identifier } from '../data-inventory/fetchAllIdentifiers.js';
import { fetchAllPreferenceTopics, type PreferenceTopic } from './fetchAllPreferenceTopics.js';
import { fetchAllPurposes, type Purpose } from './fetchAllPurposes.js';

export interface PreferenceUploadReferenceData {
  /** List of purposes in the organization */
  purposes: Purpose[];
  /** List of preference topics in the organization */
  preferenceTopics: PreferenceTopic[];
  /** List of identifiers in the organization */
  identifiers: Identifier[];
}

/**
 * Load all required reference data for an upload run.
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns Reference data arrays
 */
export async function loadReferenceData(
  client: GraphQLClient,
  { logger }: { logger: Logger },
): Promise<PreferenceUploadReferenceData> {
  const [purposes, preferenceTopics, identifiers] = await Promise.all([
    fetchAllPurposes(client, { logger }),
    fetchAllPreferenceTopics(client, { logger }),
    fetchAllIdentifiers(client, { logger }),
  ]);
  return { purposes, preferenceTopics, identifiers };
}
