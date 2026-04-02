import {
  EnricherType,
  IsoCountryCode,
  IsoCountrySubdivisionCode,
  PreflightRequestStatus,
  RequestAction,
} from '@transcend-io/privacy-types';
import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import type { Identifier } from '../data-inventory/fetchAllIdentifiers.js';
import { ENRICHERS, CREATE_ENRICHER, UPDATE_ENRICHER } from './gqls/enricher.js';

export interface EnricherInput {
  /** The display title of the enricher */
  title: string;
  /** The names of the identifiers that can be resolved by this enricher */
  'output-identifiers': string[];
  /** Internal description for why the enricher is needed */
  description?: string;
  /** The URL of the enricher */
  url?: string;
  /** The type of enricher */
  type?: EnricherType;
  /** The name of the identifier that will be the input to this enricher */
  'input-identifier'?: string;
  /** A regular expression that can be used to match on for cancellation */
  testRegex?: string;
  /** For looker integration - the title of the looker query to run */
  lookerQueryTitle?: string;
  /** The duration (in ms) that the enricher should take to execute */
  expirationDuration?: number;
  /** The status that the enricher should transfer to when condition is met */
  transitionRequestStatus?: PreflightRequestStatus;
  /** For twilio integration - the phone numbers that can be used to send text codes */
  phoneNumbers?: string[];
  /** The list of regions that should trigger the preflight check */
  regionList?: (IsoCountryCode | IsoCountrySubdivisionCode)[];
  /** Specify which data subjects the enricher should run for */
  'data-subjects'?: string[];
  /** Headers to include in the webhook */
  headers?: {
    /** Header name */
    name: string;
    /** Header value */
    value: string;
    /** Whether the value is a secret */
    isSecret?: boolean;
  }[];
  /** The privacy actions that the enricher should run against */
  'privacy-actions'?: RequestAction[];
}

export interface Enricher {
  /** ID of enricher */
  id: string;
  /** Title of enricher */
  title: string;
  /** URL of enricher */
  url: string;
  /** Server silo */
  type: EnricherType;
  /** Input identifier */
  inputIdentifier: {
    /** Identifier name */
    name: string;
  };
  /** The selected actions */
  actions: RequestAction[];
  /** Output identifiers */
  identifiers: {
    /** Identifier name */
    name: string;
  }[];
  /** Data subjects that the preflight check is configured for */
  dataSubjects: {
    /** Data subject type */
    type: string;
  }[];
  /** The duration (in ms) that the enricher should take to execute. - BigInt */
  expirationDuration: string;
  /** Looker query title */
  lookerQueryTitle?: string;
  /** A regular expression that can be used to match on for cancelation */
  testRegex?: string;
  /** The status that the enricher should transfer to when condition is met. */
  transitionRequestStatus?: PreflightRequestStatus;
  /** The twilio phone number to send from */
  phoneNumbers: string[];
  /** The list of regions that should trigger the enrichment condition */
  regionList: (IsoCountryCode | IsoCountrySubdivisionCode)[];
}

export interface DataSubjectRef {
  /** ID of data subject */
  id: string;
  /** Type of data subject */
  type: string;
}

const PAGE_SIZE = 20;

/**
 * Fetch all enrichers in the organization
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns All enrichers in the organization
 */
export async function fetchAllEnrichers(
  client: GraphQLClient,
  options: {
    /** Filter by title */
    title?: string;
    /** Logger instance */
    logger: Logger;
  },
): Promise<Enricher[]> {
  const { title, logger } = options;
  const enrichers: Enricher[] = [];
  let offset = 0;

  let shouldContinue = false;
  do {
    const {
      enrichers: { nodes },
    } = await makeGraphQLRequest<{
      /** Query response */
      enrichers: {
        /** List of matches */
        nodes: Enricher[];
      };
    }>(client, ENRICHERS, {
      variables: { first: PAGE_SIZE, offset, title },
      logger,
    });
    enrichers.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return enrichers.sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * Sync an enricher configuration
 *
 * @param client - GraphQL client
 * @param syncOptions - Sync options
 * @param options - Options
 */
export async function syncEnricher(
  client: GraphQLClient,
  syncOptions: {
    /** The enricher input */
    enricher: EnricherInput;
    /** Index of identifiers in the organization */
    identifierByName: { [name in string]: Identifier };
    /** Lookup data subject by name */
    dataSubjectsByName: { [name in string]: DataSubjectRef };
  },
  options: {
    /** Logger instance */
    logger: Logger;
  },
): Promise<void> {
  const { enricher, identifierByName, dataSubjectsByName } = syncOptions;
  const { logger } = options;
  const matches = await fetchAllEnrichers(client, {
    title: enricher.title,
    logger,
  });
  const existingEnricher = matches.find(({ title }) => title === enricher.title);

  const dataSubjectIds = enricher['data-subjects']?.map((subject) => {
    const existing = dataSubjectsByName[subject];
    if (!existing) {
      throw new Error(`Failed to find a data subject with name: ${subject}`);
    }
    return existing.id;
  });

  const inputIdentifier = enricher['input-identifier'];
  const actionUpdates = enricher['privacy-actions'] || Object.values(RequestAction);
  if (existingEnricher) {
    await makeGraphQLRequest(client, UPDATE_ENRICHER, {
      variables: {
        input: {
          id: existingEnricher.id,
          title: enricher.title,
          url: enricher.url,
          headers: enricher.headers,
          testRegex: enricher.testRegex,
          lookerQueryTitle: enricher.lookerQueryTitle,
          expirationDuration:
            typeof enricher.expirationDuration === 'number'
              ? enricher.expirationDuration.toString()
              : undefined,
          transitionRequestStatus: enricher.transitionRequestStatus,
          phoneNumbers: enricher.phoneNumbers,
          regionList: enricher.regionList,
          dataSubjectIds,
          description: enricher.description || '',
          inputIdentifier: inputIdentifier ? identifierByName[inputIdentifier]!.id : undefined,
          identifiers: enricher['output-identifiers']!.map((id) => identifierByName[id]!.id),
          ...(existingEnricher.type === EnricherType.Sombra ? {} : { actions: actionUpdates }),
        },
      },
      logger,
    });
  } else if (inputIdentifier) {
    await makeGraphQLRequest(client, CREATE_ENRICHER, {
      variables: {
        input: {
          title: enricher.title,
          url: enricher.url,
          type: enricher.type || EnricherType.Server,
          headers: enricher.headers,
          testRegex: enricher.testRegex,
          lookerQueryTitle: enricher.lookerQueryTitle,
          expirationDuration:
            typeof enricher.expirationDuration === 'number'
              ? enricher.expirationDuration.toString()
              : undefined,
          transitionRequestStatus: enricher.transitionRequestStatus,
          phoneNumbers: enricher.phoneNumbers,
          dataSubjectIds,
          regionList: enricher.regionList,
          description: enricher.description || '',
          inputIdentifier: identifierByName[inputIdentifier]!.id,
          identifiers: enricher['output-identifiers'].map((id) => identifierByName[id]!.id),
          actions: actionUpdates,
        },
      },
      logger,
    });
  }
}
