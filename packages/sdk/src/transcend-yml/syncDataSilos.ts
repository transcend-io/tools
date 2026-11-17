import { apply } from '@transcend-io/type-utils';
import { mapSeries, map, type Logger } from '@transcend-io/utils';
/* eslint-disable max-lines */
import { GraphQLClient } from 'graphql-request';
import { chunk, keyBy } from 'lodash-es';

import {
  NOOP_LOGGER,
  makeGraphQLRequest,
  type ApiKey,
  convertToDataSubjectBlockList,
  type DataSubject,
  fetchAllDataSilos,
  type DataSilo,
  CREATE_DATA_SILOS,
  UPDATE_DATA_SILOS,
  UPDATE_OR_CREATE_DATA_POINT,
} from '../index.js';
import { DataSiloInput } from './codecs.js';

const BATCH_SILOS_LIMIT = 20;

/** Receives progress updates while datapoints sync. */
export interface ProgressReporter {
  /** Called once with the total number of datapoints before syncing starts */
  start(total: number, completed: number): void;
  /** Called with the running count of synced datapoints */
  update(completed: number): void;
  /** Called after the last datapoint */
  stop(): void;
}

/**
 * Sync a data silo configuration
 *
 * @param dataSilos - Data silos to sync
 * @param client - GraphQL client
 * @param options - Options
 * @returns Data silo info
 */
export async function syncDataSilos(
  dataSilos: DataSiloInput[],
  client: GraphQLClient,
  {
    pageSize,
    dataSubjectsByName,
    apiKeysByTitle,
    logger = NOOP_LOGGER,
    progressReporter,
  }: {
    /** Page size */
    pageSize: number;
    /** The data subjects in the organization */
    dataSubjectsByName: { [type in string]: DataSubject };
    /** API key title to API key */
    apiKeysByTitle: { [title in string]: ApiKey };
    /** Logger for progress messages. Defaults to discarding them. */
    logger?: Logger;
    /** Receives datapoint sync progress. A `cli-progress` SingleBar satisfies this. */
    progressReporter?: ProgressReporter;
  },
): Promise<{
  /** Whether successfully updated */
  success: boolean;
  /** A mapping between data silo title to data silo ID */
  dataSiloTitleToId: { [k in string]: string };
}> {
  let encounteredError = false;

  // Time duration
  const t0 = new Date().getTime();
  logger.info(`Syncing "${dataSilos.length}" data silos...`);

  // Determine the set of data silos that already exist
  const existingDataSilos = await fetchAllDataSilos(client, {
    titles: dataSilos.map(({ title }) => title),
    pageSize,
    logger,
  });

  // Create a mapping of title -> existing silo, if it exists
  const existingDataSiloByTitle = keyBy<Pick<DataSilo, 'id' | 'title'>>(existingDataSilos, 'title');

  // Create new silos that do not exist
  const newDataSiloInputs = dataSilos.filter(({ title }) => !existingDataSiloByTitle[title]);
  if (newDataSiloInputs.length > 0) {
    logger.info(`Creating "${newDataSiloInputs.length}" data silos that did not exist...`);

    // Batch the creation
    const chunked = chunk(newDataSiloInputs, BATCH_SILOS_LIMIT);
    await mapSeries(chunked, async (dependencyUpdateChunk) => {
      const {
        createDataSilos: { dataSilos },
      } = await makeGraphQLRequest<{
        /** Mutation result */
        createDataSilos: {
          /** New data silos */
          dataSilos: Pick<DataSilo, 'id' | 'title'>[];
        };
      }>(client, CREATE_DATA_SILOS, {
        variables: {
          input: dependencyUpdateChunk.map((input) => ({
            name: input['outer-type'] || input.integrationName,
            title: input.title,
            country: input.country,
            countrySubDivision: input.countrySubDivision,
            sombraId: input['sombra-id'],
          })),
        },
        logger,
      });

      // save mapping of title and id
      dataSilos.forEach((silo) => {
        existingDataSiloByTitle[silo.title] = silo;
      });
    });

    logger.info(`Successfully created "${newDataSiloInputs.length}" data silos!`);
  }

  // Batch the updates
  const chunkedUpdates = chunk(dataSilos, BATCH_SILOS_LIMIT);
  await mapSeries(chunkedUpdates, async (dataSiloUpdateChunk, ind) => {
    logger.info(
      `[Batch ${ind + 1}/${chunkedUpdates.length}] Syncing "${
        dataSiloUpdateChunk.length
      }" data silos`,
    );
    await makeGraphQLRequest<{
      /** Mutation result */
      updateDataSilos: {
        /** New data silos */
        dataSilos: Pick<DataSilo, 'id' | 'title'>[];
      };
    }>(client, UPDATE_DATA_SILOS, {
      variables: {
        input: {
          dataSilos: dataSiloUpdateChunk.map((input) => ({
            id: existingDataSiloByTitle[input.title]!.id,
            country: input.country,
            countrySubDivision: input.countrySubDivision,
            url: input.url,
            headers: input.headers,
            description: input.description,
            identifiers: input['identity-keys'],
            isLive: !input.disabled,
            ownerEmails: input.owners,
            teamNames: input.teams,
            // clear out the global config if not specified, otherwise the update needs to be
            // applied after all data silos are created
            dependedOnDataSilos: input['deletion-dependencies'] ? undefined : [{ titles: [] }],
            apiKeyId: input['api-key-title']
              ? apiKeysByTitle[input['api-key-title']]!.id
              : undefined,
            dataSubjectBlockListIds: input['data-subjects']
              ? convertToDataSubjectBlockList(input['data-subjects'], dataSubjectsByName)
              : undefined,
            attributes: input.attributes,
            businessEntityTitles: input.businessEntityTitles,
            sombraId: input['sombra-id'],
            // AVC settings
            notifyEmailAddress: input['email-settings']?.['notify-email-address'],
            promptAVendorEmailSendFrequency: input['email-settings']?.['send-frequency'],
            promptAVendorEmailSendType: input['email-settings']?.['send-type'],
            promptAVendorEmailIncludeIdentifiersAttachment:
              input['email-settings']?.['include-identifiers-attachment'],
            promptAVendorEmailCompletionLinkType: input['email-settings']?.['completion-link-type'],
            manualWorkRetryFrequency: input['email-settings']?.['manual-work-retry-frequency'],
          })),
        },
      },
      logger,
    });
    logger.info(
      `[Batch ${ind + 1}/${chunkedUpdates.length}] Synced "${
        dataSiloUpdateChunk.length
      }" data silos!`,
    );
  });

  // Sync datapoints

  const dataSilosWithDataPoints = dataSilos.filter(({ datapoints = [] }) => datapoints.length > 0);
  const totalDataPoints = dataSilos
    .map(({ datapoints = [] }) => datapoints.length)
    .reduce((acc, count) => acc + count, 0);
  logger.info(
    `Syncing "${totalDataPoints}" datapoints from "${dataSilosWithDataPoints.length}" data silos...`,
  );
  progressReporter?.start(totalDataPoints, 0);
  let total = 0;

  await map(
    dataSilosWithDataPoints,
    async ({ datapoints, title }) => {
      if (datapoints) {
        await mapSeries(datapoints, async (datapoint) => {
          const fields = datapoint.fields
            ? datapoint.fields.map(
                ({ key, description, categories, purposes, attributes, ...rest }) =>
                  // TODO: Support setting title separately from the 'key/name'
                  ({
                    name: key,
                    description,
                    categories: !categories
                      ? undefined
                      : categories.map((category) => ({
                          ...category,
                          name: category.name || 'Other',
                        })),
                    purposes: !purposes
                      ? undefined
                      : purposes.map((purpose) => ({
                          ...purpose,
                          name: purpose.name || 'Other',
                        })),
                    attributes,
                    accessRequestVisibilityEnabled: rest['access-request-visibility-enabled'],
                    erasureRequestRedactionEnabled: rest['erasure-request-redaction-enabled'],
                  }),
              )
            : undefined;

          const payload = {
            dataSiloId: existingDataSiloByTitle[title]!.id,
            path: datapoint.path,
            name: datapoint.key,
            title: datapoint.title,
            description: datapoint.description,
            ...(datapoint.owners
              ? {
                  ownerEmails: datapoint.owners,
                }
              : {}),
            ...(datapoint.teams
              ? {
                  teamNames: datapoint.teams,
                }
              : {}),
            ...(datapoint['data-collection-tag']
              ? { dataCollectionTag: datapoint['data-collection-tag'] }
              : {}),
            querySuggestions: !datapoint['privacy-action-queries']
              ? undefined
              : Object.entries(datapoint['privacy-action-queries']).map(([key, value]) => ({
                  requestType: key,
                  suggestedQuery: value,
                })),
            enabledActions: datapoint['privacy-actions'] || [], // clear out when not specified
            subDataPoints: fields,
          };

          // Ensure no duplicate sub-datapoints are provided
          const subDataPointsToUpdate = (payload.subDataPoints || []).map(({ name }) => name);
          const duplicateDataPoints = subDataPointsToUpdate.filter(
            (name, index) => subDataPointsToUpdate.indexOf(name) !== index,
          );
          if (duplicateDataPoints.length > 0) {
            logger.info(
              `\nCannot update datapoint "${
                datapoint.key
              }" as it has duplicate sub-datapoints with the same name: \n${duplicateDataPoints.join(
                '\n',
              )}`,
            );
            encounteredError = true;
          } else {
            try {
              await makeGraphQLRequest(client, UPDATE_OR_CREATE_DATA_POINT, {
                variables: payload,
                logger,
              });
            } catch (err) {
              logger.info(
                `\nFailed to update datapoint "${datapoint.key}" for data silo "${title}"! - \n${(err as Error).message}`,
              );
              encounteredError = true;
            }
          }
          total += 1;
          progressReporter?.update(total);
        });
      }
    },
    {
      concurrency: 10,
    },
  );

  progressReporter?.stop();
  const t1 = new Date().getTime();
  const totalTime = t1 - t0;

  logger.info(
    `Synced "${dataSilos.length}" data silos and "${totalDataPoints}" datapoints in "${
      totalTime / 1000
    }" seconds!`,
  );
  return {
    success: !encounteredError,
    dataSiloTitleToId: apply(existingDataSiloByTitle, ({ id }) => id),
  };
}
/* eslint-enable max-lines */
