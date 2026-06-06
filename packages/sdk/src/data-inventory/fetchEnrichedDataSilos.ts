import {
  IsoCountryCode,
  IsoCountrySubdivisionCode,
  PromptAVendorEmailCompletionLinkType,
  PromptAVendorEmailSendType,
} from '@transcend-io/privacy-types';
import { mapSeries, type Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
import { fetchAllDataPoints, type DataPointWithSubDataPoint } from './fetchAllDataPoints.js';
import { fetchAllDataSilos, type DataSiloAttributeValue } from './fetchAllDataSilos.js';
import { DATA_SILOS_ENRICHED } from './gqls/dataSilo.js';

export interface DataSiloEnriched {
  /** ID of dataSilo */
  id: string;
  /** Title of dataSilo */
  title: string;
  /** Type of silo */
  type: string;
  /** Link to silo */
  link: string;
  /** Outer type of silo */
  outerType: string;
  /** Description of data silo */
  description: string;
  /** Webhook URL */
  url?: string;
  /** Email address of user to notify for prompt a person use case */
  notifyEmailAddress?: string;
  /** Associated API keys */
  apiKeys: {
    /** Title */
    title: string;
  }[];
  /** Data subject block list */
  subjectBlocklist: {
    /** Type of data subject */
    type: string;
  }[];
  /** Identifiers */
  identifiers: {
    /** Name of identifier */
    name: string;
    /** True if identifier is wired */
    isConnected: boolean;
  }[];
  /** Dependent data silos */
  dependentDataSilos: {
    /** Title of silo */
    title: string;
  }[];
  /** Silo owners */
  owners: {
    /** Email owners */
    email: string;
  }[];
  /** The teams assigned to this data silo */
  teams: {
    /** Name of the team assigned to this data silo */
    name: string;
  }[];
  /** Metadata for this data silo */
  catalog: {
    /** Whether the data silo supports automated vendor coordination */
    hasAvcFunctionality: boolean;
  };
  /** Silo is live */
  isLive: boolean;
  /** Hosting country of data silo */
  country?: IsoCountryCode;
  /** Hosting subdivision data silo */
  countrySubDivision?: IsoCountrySubdivisionCode;
  /**
   * The frequency with which we should be sending emails for this data silo, in milliseconds.
   */
  promptAVendorEmailSendFrequency: number;
  /**
   * The type of emails to send for this data silo, i.e. send an email for each DSR, across all open DSRs,
   * or per profile in a DSR.
   */
  promptAVendorEmailSendType: PromptAVendorEmailSendType;
  /**
   * Indicates whether prompt-a-vendor emails should include a list of identifiers
   * in addition to a link to the bulk processing UI.
   */
  promptAVendorEmailIncludeIdentifiersAttachment: boolean;
  /**
   * Indicates what kind of link to generate as part of the emails sent out for this Prompt-a-Vendor silo.
   */
  promptAVendorEmailCompletionLinkType: PromptAVendorEmailCompletionLinkType;
  /**
   * The frequency with which we should retry sending emails for this data silo, in milliseconds.
   * Needs to be a string because the number can be larger than the MAX_INT
   */
  manualWorkRetryFrequency: string;
  /** Attribute values tagged to data silo */
  attributeValues: DataSiloAttributeValue[];
  /**
   * The data silos that discovered this particular data silo
   */
  discoveredBy: {
    /** Title of data silo */
    title: string;
  }[];
  /**
   * The business entities assigned directly to this data silo
   */
  businessEntities: {
    /** Title of business entity */
    title: string;
  }[];
}

/**
 * Fetch all dataSilos with additional metadata
 *
 * @param client - GraphQL client
 * @param options - Filter options
 * @returns All dataSilos in the organization
 */
export async function fetchEnrichedDataSilos(
  client: GraphQLClient,
  options: {
    /** Page size */
    pageSize: number;
    /** Filter by IDs */
    ids?: string[];
    /** Enable debug logs */
    debug?: boolean;
    /** Filter by title */
    titles?: string[];
    /** Integration names */
    integrationNames?: string[];
    /** Skip fetching of datapoints */
    skipDatapoints?: boolean;
    /** Skip fetching of subdatapoints */
    skipSubDatapoints?: boolean;
    /** When true, metadata around guessed data categories should be included */
    includeGuessedCategories?: boolean;
    /** Logger instance */
    logger?: Logger;
  },
): Promise<[DataSiloEnriched, DataPointWithSubDataPoint[]][]> {
  const {
    ids,
    pageSize,
    titles,
    debug,
    skipDatapoints,
    skipSubDatapoints,
    includeGuessedCategories,
    integrationNames,
    logger = NOOP_LOGGER,
  } = options;

  const dataSilos: [DataSiloEnriched, DataPointWithSubDataPoint[]][] = [];

  const silos = await fetchAllDataSilos<DataSiloEnriched>(client, {
    titles,
    ids,
    integrationNames,
    pageSize,
    gql: DATA_SILOS_ENRICHED,
    logger,
  });

  if (!skipDatapoints) {
    await mapSeries(silos, async (silo, index) => {
      logger.info(`[${index + 1}/${silos.length}] Fetching data silo - ${silo.title}`);

      const dataPoints = await fetchAllDataPoints(client, {
        filterBy: { dataSiloId: silo.id },
        debug,
        pageSize,
        skipSubDatapoints,
        includeGuessedCategories,
        logger,
      });

      if (debug) {
        logger.info(
          `[${index + 1}/${silos.length}] Successfully fetched datapoint for - ${silo.title}`,
        );
      }

      dataSilos.push([silo, dataPoints]);
    });
  }

  logger.info(`Successfully fetched all ${silos.length} data silo configurations`);

  return dataSilos;
}
