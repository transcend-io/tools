import {
  ConfidenceLabel,
  DataCategoryType,
  ProcessingPurpose,
  RequestActionObjectResolver,
  SubDataPointDataSubCategoryGuessStatus,
} from '@transcend-io/privacy-types';
import { map, type Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';
import { sortBy } from 'lodash-es';

import { makeGraphQLRequest, NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
import type { DataSiloAttributeValue } from './fetchAllDataSilos.js';
import { DATA_POINTS, SUB_DATA_POINTS, SUB_DATA_POINTS_WITH_GUESSES } from './gqls/dataPoint.js';

export interface SubDataPointCategory {
  /** Sub-category name */
  name: string;
  /** Top-level category */
  category: DataCategoryType;
}

export interface SubDataPointPurpose {
  /** Sub-purpose name */
  name: string;
  /** Top-level purpose */
  purpose: ProcessingPurpose;
}

export interface SubDataPoint {
  /** Name (or key) of the subdatapoint */
  name: string;
  /** The description */
  description?: string;
  /** Personal data category */
  categories: SubDataPointCategory[];
  /** The processing purpose for this sub datapoint */
  purposes: SubDataPointPurpose[];
  /**
   * When true, this subdatapoint should be revealed in a data access request.
   * When false, this field should be redacted
   */
  accessRequestVisibilityEnabled: boolean;
  /**
   * When true, this subdatapoint should be redacted during an erasure request.
   * There normally is a choice of enabling hard deletion or redaction at the
   * datapoint level, but if redaction is enabled, this column can be used
   * to define which fields should be redacted.
   */
  erasureRequestRedactionEnabled: boolean;
  /** Attribute attached to subdatapoint */
  attributeValues: DataSiloAttributeValue[];
  /** Data category guesses that are output by the classifier */
  pendingCategoryGuesses?: {
    /** Data category being guessed */
    category: SubDataPointCategory;
    /** Status of guess */
    status: SubDataPointDataSubCategoryGuessStatus;
    /** Confidence level of guess */
    confidence: number;
    /** Confidence label */
    confidenceLabel: ConfidenceLabel;
    /** classifier version that produced the guess */
    classifierVersion: number;
  }[];
}

export interface DataPoint {
  /** ID of dataPoint */
  id: string;
  /** Title of dataPoint */
  title: {
    /** Default message */
    defaultMessage: string;
  };
  /** The path to this data point */
  path: string[];
  /** Description */
  description: {
    /** Default message */
    defaultMessage: string;
  };
  /** Name */
  name: string;
  /** Global actions */
  actionSettings: {
    /** Action type */
    type: RequestActionObjectResolver;
    /** Is enabled */
    active: boolean;
  }[];
  /** Data collection tag for privacy request download zip labeling */
  dataCollection?: {
    /** Title of data collection */
    title: {
      /** Default message (since message can be translated) */
      defaultMessage: string;
    };
  };
  /** Metadata for this data silo */
  catalog: {
    /** Whether the data silo supports automated vendor coordination */
    hasAvcFunctionality: boolean;
  };
  /** Owners of the datapoint */
  owners: {
    /** Email address of the owner */
    email: string;
  }[];
  /** Teams that own the datapoint */
  teams: {
    /** Name of the team */
    name: string;
  }[];
  /** Database integration queries */
  dbIntegrationQueries: {
    /** Approved query */
    query: string | null;
    /** Suggested query */
    suggestedQuery: string | null;
    /** Request action */
    requestType: RequestActionObjectResolver;
  }[];
}

export interface DataPointWithSubDataPoint extends DataPoint {
  /** The associated subdatapoints */
  subDataPoints: SubDataPoint[];
}

/**
 * Helper to fetch all subdatapoints for a given datapoint
 *
 * @param client - The GraphQL client
 * @param dataPointId - The datapoint ID
 * @param options - Options
 * @returns The list of subdatapoints
 */
export async function fetchAllSubDataPoints(
  client: GraphQLClient,
  options: {
    /** Filter criteria */
    filterBy: {
      /** Datapoint ID to fetch sub-datapoints for */
      dataPointId: string;
    };
    /** Enable debug logging */
    debug?: boolean;
    /** Page size for paginated fetching */
    pageSize: number;
    /** When true, metadata around guessed data categories should be included */
    includeGuessedCategories?: boolean;
    /** Logger instance */
    logger?: Logger;
  },
): Promise<SubDataPoint[]> {
  const {
    filterBy: { dataPointId },
    debug,
    includeGuessedCategories,
    pageSize,
    logger = NOOP_LOGGER,
  } = options;
  const subDataPoints: SubDataPoint[] = [];

  let offset = 0;

  let shouldContinue = false;
  do {
    try {
      if (debug) {
        logger.info(`Pulling in subdatapoints for offset ${offset}`);
      }
      const {
        subDataPoints: { nodes },
      } = await makeGraphQLRequest<{
        /** Query response */
        subDataPoints: {
          /** List of matches */
          nodes: SubDataPoint[];
        };
      }>(client, includeGuessedCategories ? SUB_DATA_POINTS_WITH_GUESSES : SUB_DATA_POINTS, {
        variables: {
          first: pageSize,
          filterBy: {
            dataPoints: [dataPointId],
          },
          offset,
        },
        logger,
      });

      subDataPoints.push(...nodes);
      offset += pageSize;
      shouldContinue = nodes.length === pageSize;

      if (debug) {
        logger.info(`Pulled in subdatapoints for offset ${offset} for dataPointId=${dataPointId}`);
      }
    } catch (err) {
      logger.error(
        `An error fetching subdatapoints for offset ${offset} for dataPointId=${dataPointId}`,
      );
      throw err;
    }
  } while (shouldContinue);
  return sortBy(subDataPoints, 'name');
}

/**
 * Fetch all datapoints for a data silo
 *
 * @param client - GraphQL client
 * @param dataSiloId - Data silo ID
 * @param options - Options
 * @returns List of datapoints
 */
export async function fetchAllDataPoints(
  client: GraphQLClient,
  options: {
    /** Filter criteria */
    filterBy: {
      /** Data silo ID to fetch datapoints for */
      dataSiloId: string;
    };
    /** Enable debug logging */
    debug?: boolean;
    /** Page size for paginated fetching */
    pageSize: number;
    /** Skip fetching of subdatapoints */
    skipSubDatapoints?: boolean;
    /** When true, metadata around guessed data categories should be included */
    includeGuessedCategories?: boolean;
    /** Logger instance */
    logger?: Logger;
  },
): Promise<DataPointWithSubDataPoint[]> {
  const {
    filterBy: { dataSiloId },
    debug,
    pageSize,
    skipSubDatapoints,
    includeGuessedCategories,
    logger = NOOP_LOGGER,
  } = options;
  const dataPoints: DataPointWithSubDataPoint[] = [];

  // TODO: https://transcend.height.app/T-40481 - add cursor pagination
  let offset = 0;

  let shouldContinue = false;
  do {
    if (debug) {
      logger.info(`Fetching datapoints with offset: ${offset}`);
    }

    const {
      dataPoints: { nodes },
    } = await makeGraphQLRequest<{
      /** Query response */
      dataPoints: {
        /** List of matches */
        nodes: DataPoint[];
      };
    }>(client, DATA_POINTS, {
      variables: {
        first: pageSize,
        filterBy: {
          dataSilos: [dataSiloId],
        },
        offset,
      },
      logger,
    });

    if (debug) {
      logger.info(`Fetched ${nodes.length} datapoints at offset: ${offset}`);
    }

    if (!skipSubDatapoints) {
      await map(
        nodes,
        async (node) => {
          try {
            if (debug) {
              logger.info(`Fetching subdatapoints for ${node.name} for datapoint offset ${offset}`);
            }

            const subDataPoints = await fetchAllSubDataPoints(client, {
              filterBy: { dataPointId: node.id },
              pageSize: 1000,
              debug,
              includeGuessedCategories,
              logger,
            });
            dataPoints.push({
              ...node,
              subDataPoints: subDataPoints.sort((a, b) => a.name.localeCompare(b.name)),
            });

            if (debug) {
              logger.info(`Successfully fetched subdatapoints for ${node.name}`);
            }
          } catch (err) {
            logger.error(
              `An error fetching subdatapoints for ${node.name} datapoint offset ${offset}`,
            );
            throw err;
          }
        },
        {
          concurrency: 5,
        },
      );

      if (debug) {
        logger.info(`Fetched all subdatapoints for page of datapoints at offset: ${offset}`);
      }
    }

    offset += pageSize;
    shouldContinue = nodes.length === pageSize;
  } while (shouldContinue);
  return dataPoints.sort((a, b) => a.name.localeCompare(b.name));
}
