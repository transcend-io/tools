import { ConsentTrackerStatus, DataFlowScope } from '@transcend-io/privacy-types';
import { mapSeries, type Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';
import { chunk } from 'lodash-es';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { fetchAllDataFlows } from './fetchAllDataFlows.js';
import { fetchConsentManagerId } from './fetchConsentManagerId.js';
import { CREATE_DATA_FLOWS, UPDATE_DATA_FLOWS } from './gqls/consentManager.js';

/** Attribute key-value pair for a data flow */
export interface DataFlowAttributeInput {
  /** Attribute key */
  key: string;
  /** Attribute values */
  values: string[];
}

/**
 * Input to define a data flow for sync
 *
 * @see https://app.transcend.io/consent-manager/data-flows/approved
 */
export interface DataFlowInput {
  /** Value of data flow */
  value: string;
  /** Type of data flow */
  type: DataFlowScope;
  /** Description of data flow */
  description?: string;
  /** The tracking purposes that are required to be opted in for this data flow */
  trackingPurposes?: string[];
  /** Name of the consent service attached */
  service?: string;
  /** Status of the tracker (approved vs triage) */
  status?: ConsentTrackerStatus;
  /** Email addresses of owners */
  owners?: string[];
  /** Names of teams responsible for managing this data flow */
  teams?: string[];
  /** Attribute key-value pairs */
  attributes?: DataFlowAttributeInput[];
}

const MAX_PAGE_SIZE = 100;

/**
 * Update data flows that already existed
 *
 * @param client - GraphQL client
 * @param dataFlowInputs - [DataFlowInput, Data Flow ID] mappings to update
 * @param options - Options
 */
export async function updateDataFlows(
  client: GraphQLClient,
  dataFlowInputs: [DataFlowInput, string][],
  options: {
    /** Classify service if missing */
    classifyService?: boolean;
    /** Logger instance */
    logger: Logger;
  },
): Promise<void> {
  const { classifyService = false, logger } = options;
  const airgapBundleId = await fetchConsentManagerId(client, { logger });

  // TODO: https://transcend.height.app/T-19841 - add with custom purposes
  // const purposes = await fetchAllPurposes(client);
  // const purposeNameToId = keyBy(purposes, 'name');

  await mapSeries(chunk(dataFlowInputs, MAX_PAGE_SIZE), async (page) => {
    await makeGraphQLRequest(client, UPDATE_DATA_FLOWS, {
      variables: {
        airgapBundleId,
        dataFlows: page.map(([flow, id]) => ({
          id,
          value: flow.value,
          type: flow.type,
          trackingType:
            flow.trackingPurposes && flow.trackingPurposes.length > 0
              ? flow.trackingPurposes
              : undefined,
          // TODO: https://transcend.height.app/T-19841 - add with custom purposes
          // purposeIds: flow.trackingPurposes
          //   ? flow.trackingPurposes
          //       .filter((purpose) => purpose !== 'Unknown')
          //       .map((purpose) => purposeNameToId[purpose].id)
          // : undefined,
          description: flow.description,
          service: flow.service,
          status: flow.status,
          attributes: flow.attributes,
          // TODO: https://transcend.height.app/T-23718
          // owners,
          // teams,
        })),
        classifyService,
      },
      logger,
    });
  });
}

/**
 * Create new data flows
 *
 * @param client - GraphQL client
 * @param dataFlowInputs - List of data flows to create
 * @param options - Options
 */
export async function createDataFlows(
  client: GraphQLClient,
  dataFlowInputs: DataFlowInput[],
  options: {
    /** Classify service if missing */
    classifyService?: boolean;
    /** Logger instance */
    logger: Logger;
  },
): Promise<void> {
  const { classifyService = false, logger } = options;
  const airgapBundleId = await fetchConsentManagerId(client, { logger });

  // TODO: https://transcend.height.app/T-19841 - add with custom purposes
  // const purposes = await fetchAllPurposes(client);
  // const purposeNameToId = keyBy(purposes, 'name');

  await mapSeries(chunk(dataFlowInputs, MAX_PAGE_SIZE), async (page) => {
    await makeGraphQLRequest(client, CREATE_DATA_FLOWS, {
      variables: {
        airgapBundleId,
        dataFlows: page.map((flow) => ({
          value: flow.value,
          type: flow.type,
          trackingType:
            flow.trackingPurposes && flow.trackingPurposes.length > 0
              ? flow.trackingPurposes
              : undefined,
          // TODO: https://transcend.height.app/T-19841 - add with custom purposes
          // purposeIds: flow.trackingPurposes
          //   ? flow.trackingPurposes
          //       .filter((purpose) => purpose !== 'Unknown')
          //       .map((purpose) => purposeNameToId[purpose].id)
          //   : undefined,
          description: flow.description,
          service: flow.service,
          status: flow.status,
          attributes: flow.attributes,
          // TODO: https://transcend.height.app/T-23718
          // owners,
          // teams,
        })),
        classifyService,
      },
      logger,
    });
  });
}

/**
 * Sync data flow configurations into Transcend
 *
 * @param client - GraphQL client
 * @param dataFlows - The data flows to upload
 * @param options - Options
 * @returns True if the command ran successfully, returns false if an error occurred
 */
export async function syncDataFlows(
  client: GraphQLClient,
  dataFlows: DataFlowInput[],
  options: {
    /** When true, auto classify the service based on the data flow value */
    classifyService?: boolean;
    /** Logger instance */
    logger: Logger;
  },
): Promise<boolean> {
  const { classifyService = false, logger } = options;
  let encounteredError = false;
  logger.info(`Syncing "${dataFlows.length}" data flows...`);

  const notUnique = dataFlows.filter(
    (dataFlow) =>
      dataFlows.filter((flow) => dataFlow.value === flow.value && dataFlow.type === flow.type)
        .length > 1,
  );

  if (notUnique.length > 0) {
    throw new Error(
      `Failed to upload data flows as there were non-unique entries found: ${notUnique
        .map(({ value }) => value)
        .join(',')}`,
    );
  }

  logger.info('Fetching data flows...');
  const [existingLiveDataFlows, existingInReviewDataFlows] = await Promise.all([
    fetchAllDataFlows(client, {
      logger,
      filterBy: { status: ConsentTrackerStatus.Live },
    }),
    fetchAllDataFlows(client, {
      logger,
      filterBy: { status: ConsentTrackerStatus.NeedsReview },
    }),
  ]);
  const allDataFlows = [...existingLiveDataFlows, ...existingInReviewDataFlows];

  const mapDataFlowsToExisting = dataFlows.map((dataFlow) => [
    dataFlow,
    allDataFlows.find((flow) => dataFlow.value === flow.value && dataFlow.type === flow.type)?.id,
  ]);

  const newDataFlows = mapDataFlowsToExisting
    .filter(([, existing]) => !existing)
    .map(([flow]) => flow as DataFlowInput);
  try {
    logger.info(`Creating "${newDataFlows.length}" new data flows...`);
    await createDataFlows(client, newDataFlows, { classifyService, logger });
    logger.info(`Successfully synced ${newDataFlows.length} data flows!`);
  } catch (err) {
    encounteredError = true;
    logger.error(`Failed to create data flows! - ${(err as Error).message}`);
  }

  const existingDataFlows = mapDataFlowsToExisting.filter(
    (x): x is [DataFlowInput, string] => !!x[1],
  );
  try {
    logger.info(`Updating "${existingDataFlows.length}" data flows...`);
    await updateDataFlows(client, existingDataFlows, { classifyService, logger });
    logger.info(`Successfully updated "${existingDataFlows.length}" data flows!`);
  } catch (err) {
    encounteredError = true;
    logger.error(`Failed to update data flows! - ${(err as Error).message}`);
  }

  logger.info(`Synced "${dataFlows.length}" data flows!`);

  return !encounteredError;
}
