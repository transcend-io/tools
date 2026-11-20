import { map, type Logger, type SyncError, type SyncResult } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import {
  NOOP_LOGGER,
  fetchAllActions,
  fetchAllAttributes,
  fetchAllDataSubjects,
  fetchApiKeys,
  fetchIdentifiersAndCreateMissing,
  syncAction,
  syncActionItemCollections,
  syncActionItems,
  syncAttribute,
  syncBusinessEntities,
  syncDataCategories,
  syncConsentManager,
  syncConsentSites,
  syncCookies,
  syncDataFlows,
  syncDataSubject,
  syncDataSiloDependencies,
  syncEnricher,
  syncIdentifier,
  syncIntlMessages,
  syncPartitions,
  syncPolicies,
  syncPrivacyCenter,
  syncProcessingActivities,
  syncProcessingPurposes,
  syncConsentWorkflowTriggers,
  syncWorkflowConfigs,
  syncPreferenceOptionValues,
  syncPurposes,
  syncPreferenceTopics,
  syncTeams,
  syncTemplate,
  syncVendors,
  type DependedOnDataSiloInput,
  type Identifier,
} from '../index.js';
/* eslint-disable max-lines */
import { TranscendInput, normalizeTranscendInput } from './codecs.js';
import { ensureAllDataSubjectsExist } from './ensureAllDataSubjectsExist.js';
import { normalizeDeletionDependencies } from './normalizeDeletionDependencies.js';
import { syncDataSilos, type ProgressReporter } from './syncDataSilos.js';
import { validatePreferenceManagementSlugs } from './validatePreferenceManagementSlugs.js';

const CONCURRENCY = 10;

/**
 * Sync the yaml input back to Transcend using the GraphQL APIs
 *
 * @param input - The yml input
 * @param client - GraphQL client
 * @param pageSize - Page size
 * @returns Structured sync result with per-resource errors
 */
export async function syncConfigurationToTranscend(
  rawInput: TranscendInput,
  client: GraphQLClient,
  {
    pageSize = 50,
    // TODO: https://transcend.height.app/T-23779
    publishToPrivacyCenter = true,
    classifyService = false,
    deleteExtraAttributeValues = false,
    logger: syncLogger,
    progressReporter,
    warnings = [],
  }: {
    /** Page size */
    pageSize?: number;
    /** When true, skip publishing to privacy center */
    publishToPrivacyCenter?: boolean;
    /** When true, delete any attributes being synced up */
    deleteExtraAttributeValues?: boolean;
    /** classify data flow service if missing */
    classifyService?: boolean;
    /** Optional logger (e.g. collecting logger for MCP debug responses) */
    logger?: Logger;
    /** Receives datapoint sync progress (a `cli-progress` SingleBar satisfies this) */
    progressReporter?: ProgressReporter;
    /** Non-fatal warnings to include in the result */
    warnings?: string[];
  },
): Promise<SyncResult> {
  const input = normalizeTranscendInput(rawInput);
  const logger = syncLogger ?? NOOP_LOGGER;
  const errors: SyncError[] = [];
  let encounteredError = false;

  const recordError = (resource: string, message: string, item?: string): void => {
    errors.push({ resource, item, message });
    encounteredError = true;
  };

  logger.info(`Fetching data with page size ${pageSize}...`);

  const {
    templates,
    attributes,
    actions,
    identifiers,
    'data-subjects': dataSubjects,
    'business-entities': businessEntities,
    preflights,
    cookies,
    'consent-sites': consentSites,
    'consent-manager': consentManager,
    'data-silos': dataSilos,
    'data-flows': dataFlows,
    vendors,
    'data-categories': dataCategories,
    'processing-activities': processingActivities,
    'processing-purposes': processingPurposes,
    'action-items': actionItems,
    'action-item-collections': actionItemCollections,
    teams,
    'privacy-center': privacyCenter,
    messages,
    policies,
    partitions,
    'preference-workflow-configs': preferenceWorkflowConfigs,
    'workflow-configs': workflowConfigs,
  } = input;

  const preferenceOptions = input['preference-options'];
  const purposes = input.purposes;

  const preferenceSlugErrors = validatePreferenceManagementSlugs(input);
  if (preferenceSlugErrors.length > 0) {
    for (const message of preferenceSlugErrors) {
      recordError('preference-slugs', message);
    }
    return {
      success: false,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  const [identifierByName, dataSubjectsByName, apiKeyTitleMap] = await Promise.all([
    // Ensure all identifiers are created and create a map from name -> identifier.id
    preflights || identifiers
      ? fetchIdentifiersAndCreateMissing(client, {
          input,
          skipPublish: !publishToPrivacyCenter,
          logger,
        })
      : ({} as { [k in string]: Identifier }),
    // Grab all data subjects in the organization
    dataSilos || dataSubjects || preflights || processingActivities
      ? ensureAllDataSubjectsExist(input, client, false, { logger })
      : {},
    // Grab API keys
    dataSilos &&
    dataSilos
      .map((dataSilo) => dataSilo['api-key-title'] || [])
      .reduce((acc, lst) => acc + lst.length, 0) > 0
      ? fetchApiKeys(client, { apiKeyInputs: input, logger })
      : {},
  ]);

  if (preferenceWorkflowConfigs?.length) {
    const preferenceWorkflowConfigsSuccess = await syncConsentWorkflowTriggers(
      client,
      preferenceWorkflowConfigs,
      {
        logger,
        pageSize,
      },
    );
    if (!preferenceWorkflowConfigsSuccess) {
      recordError('preference-workflow-configs', 'Failed to sync preference workflow configs');
    }
  }

  if (workflowConfigs?.length) {
    const workflowConfigsSuccess = await syncWorkflowConfigs(client, workflowConfigs, {
      logger,
    });
    if (!workflowConfigsSuccess) {
      recordError('workflow-configs', 'Failed to sync workflow configs');
    }
  }

  if (preferenceOptions?.length) {
    const preferenceOptionsSuccess = await syncPreferenceOptionValues(client, preferenceOptions, {
      logger,
    });
    if (!preferenceOptionsSuccess) {
      recordError('preference-options', 'Failed to sync preference option values');
    }
  }

  // Sync consent purposes and their nested preference topics.
  // Order matters: option values (above) exist first, then purposes, then topics
  // (which link to their purpose by ID and to option values by slug).
  if (purposes?.length) {
    const { success: purposesSuccess, purposeIdByTrackingType } = await syncPurposes(
      client,
      purposes,
      { logger },
    );
    if (!purposesSuccess) {
      recordError('purposes', 'Failed to sync one or more purposes');
    }

    const topics = purposes.flatMap((purpose) =>
      (purpose['preference-topics'] ?? []).map((topic) => ({
        ...topic,
        'tracking-type': purpose.trackingType,
      })),
    );
    if (topics.length > 0) {
      const topicsSuccess = await syncPreferenceTopics(client, topics, {
        logger,
        purposeIdByTrackingType,
      });
      if (!topicsSuccess) {
        recordError('preference-topics', 'Failed to sync one or more preference topics');
      }
    }
  }

  // Sync consent manager
  if (consentManager) {
    logger.info('Syncing consent manager...');
    try {
      await syncConsentManager(client, consentManager, { logger });
      logger.info('Successfully synced consent manager!');
    } catch (err) {
      recordError('consent-manager', (err as Error).message);
      logger.error(`Failed to sync consent manager! - ${(err as Error).message}`);
    }
  }

  if (teams) {
    const teamsSuccess = await syncTeams(client, teams, { logger });
    if (!teamsSuccess) {
      recordError('teams', 'Failed to sync teams');
    }
  }

  // Sync email templates
  if (templates) {
    logger.info(`Syncing "${templates.length}" email templates...`);
    await map(
      templates,
      async (template) => {
        logger.info(`Syncing template "${template.title}"...`);
        try {
          await syncTemplate(client, template, { logger });
          logger.info(`Successfully synced template "${template.title}"!`);
        } catch (err) {
          recordError('templates', (err as Error).message, template.title);
          logger.error(`Failed to sync template "${template.title}"! - ${(err as Error).message}`);
        }
      },
      {
        concurrency: CONCURRENCY,
      },
    );
    logger.info(`Synced "${templates.length}" email templates!`);
  }

  // Sync business entities
  if (businessEntities) {
    const businessEntitySuccess = await syncBusinessEntities(client, businessEntities, { logger });
    if (!businessEntitySuccess) {
      recordError('business-entities', 'Failed to sync business-entities');
    }
  }

  // Sync vendors
  if (vendors) {
    const vendorsSuccess = await syncVendors(client, vendors, { logger });
    if (!vendorsSuccess) {
      recordError('vendors', 'Failed to sync vendors');
    }
  }

  // Sync data categories
  if (dataCategories) {
    const dataCategoriesSuccess = await syncDataCategories(client, dataCategories, {
      logger,
      onError: (message, item) => recordError('data-categories', message, item),
    });
    if (!dataCategoriesSuccess && !errors.some((error) => error.resource === 'data-categories')) {
      recordError('data-categories', 'Failed to sync data-categories');
    }
  }

  // Sync processing purposes
  if (processingPurposes) {
    const processingPurposesSuccess = await syncProcessingPurposes(client, processingPurposes, {
      logger,
    });
    if (!processingPurposesSuccess) {
      recordError('processing-purposes', 'Failed to sync processing-purposes');
    }
  }

  // Sync partitions
  if (partitions) {
    const partitionsSuccess = await syncPartitions(client, partitions, { logger });
    if (!partitionsSuccess) {
      recordError('partitions', 'Failed to sync partitions');
    }
  }

  // Sync cookies
  if (cookies) {
    const cookiesSuccess = await syncCookies(client, cookies, { logger });
    if (!cookiesSuccess) {
      recordError('cookies', 'Failed to sync cookies');
    }
  }

  // Sync consent sites
  if (consentSites) {
    const consentSitesSuccess = await syncConsentSites(client, consentSites, { logger });
    if (!consentSitesSuccess) {
      recordError('consent-sites', 'Failed to sync consent sites');
    }
  }

  // Sync action item collections
  if (actionItemCollections) {
    const actionItemCollectionsSuccess = await syncActionItemCollections(
      client,
      actionItemCollections,
      { logger },
    );
    if (!actionItemCollectionsSuccess) {
      recordError('action-item-collections', 'Failed to sync action-item-collections');
    }
  }

  // Sync attributes
  if (attributes) {
    // Fetch existing
    logger.info(`Syncing "${attributes.length}" attributes...`);
    const existingAttributes = await fetchAllAttributes(client, { logger });
    await map(
      attributes,
      async (attribute) => {
        const existing = existingAttributes.find((attr) => attr.name === attribute.name);

        logger.info(`Syncing attribute "${attribute.name}"...`);
        try {
          await syncAttribute(client, attribute, {
            existingAttribute: existing,
            deleteExtraAttributeValues,
            logger,
          });
          logger.info(`Successfully synced attribute "${attribute.name}"!`);
        } catch (err) {
          recordError('attributes', (err as Error).message, attribute.name);
          logger.error(`Failed to sync attribute "${attribute.name}"! - ${(err as Error).message}`);
        }
      },
      {
        concurrency: CONCURRENCY,
      },
    );
    logger.info(`Synced "${attributes.length}" attributes!`);
  }

  // Sync action items
  if (actionItems) {
    const actionItemsSuccess = await syncActionItems(client, actionItems, { logger });
    if (!actionItemsSuccess) {
      recordError('action-items', 'Failed to sync action-items');
    }
  }

  // Sync preflight checks
  if (preflights) {
    logger.info(`Syncing "${preflights.length}" preflight checks...`);
    await map(
      preflights,
      async (preflight) => {
        logger.info(`Syncing preflight check "${preflight.title}"...`);
        try {
          await syncEnricher(client, {
            input: preflight,
            identifierByName,
            dataSubjectsByName,
            logger,
          });
          logger.info(`Successfully synced preflight check "${preflight.title}"!`);
        } catch (err) {
          recordError('preflights', (err as Error).message, preflight.title);
          logger.error(
            `Failed to sync preflight check "${preflight.title}"! - ${(err as Error).message}`,
          );
        }
      },
      {
        concurrency: CONCURRENCY,
      },
    );
    logger.info(`Synced "${preflights.length}" preflight checks!`);
  }

  // Sync identifiers
  if (identifiers) {
    // Fetch existing
    logger.info(`Syncing "${identifiers.length}" identifiers...`);
    await map(
      identifiers,
      async (identifier) => {
        const existing = identifierByName[identifier.name];
        if (!existing) {
          recordError(
            'identifiers',
            `Failed to find identifier with name: ${identifier.type}. Should have been auto-created by cli.`,
            identifier.name,
          );
          return;
        }

        logger.info(`Syncing identifier "${identifier.type}"...`);
        try {
          await syncIdentifier(client, {
            input: identifier,
            dataSubjectsByName,
            identifierId: existing.id,
            skipPublish: !publishToPrivacyCenter,
            logger,
          });
          logger.info(`Successfully synced identifier "${identifier.type}"!`);
        } catch (err) {
          recordError('identifiers', (err as Error).message, identifier.name);
          logger.error(
            `Failed to sync identifier "${identifier.type}"! - ${(err as Error).message}`,
          );
        }
      },
      {
        concurrency: CONCURRENCY,
      },
    );
    logger.info(`Synced "${identifiers.length}" identifiers!`);
  }

  // Sync actions
  if (actions) {
    // Fetch existing
    logger.info(`Syncing "${actions.length}" actions...`);
    const existingActions = await fetchAllActions(client, { logger });
    await map(
      actions,
      async (action) => {
        const existing = existingActions.find((act) => act.type === action.type);
        if (!existing) {
          recordError(
            'actions',
            `Failed to find action with type: ${action.type}. Should have already existing in the organization.`,
            action.type,
          );
          return;
        }

        logger.info(`Syncing action "${action.type}"...`);
        try {
          await syncAction(
            client,
            {
              action,
              actionId: existing.id,
              skipPublish: !publishToPrivacyCenter,
            },
            { logger },
          );
          logger.info(`Successfully synced action "${action.type}"!`);
        } catch (err) {
          recordError('actions', (err as Error).message, action.type);
          logger.error(`Failed to sync action "${action.type}"! - ${(err as Error).message}`);
        }
      },
      {
        concurrency: CONCURRENCY,
      },
    );
    logger.info(`Synced "${actions.length}" actions!`);
  }

  // Sync data subjects
  if (dataSubjects) {
    // Fetch existing
    logger.info(`Syncing "${dataSubjects.length}" data subjects...`);
    const existingDataSubjects = await fetchAllDataSubjects(client, { logger });
    await map(
      dataSubjects,
      async (dataSubject) => {
        const existing = existingDataSubjects.find((subj) => subj.type === dataSubject.type);
        if (!existing) {
          recordError(
            'data-subjects',
            `Failed to find data subject with type: ${dataSubject.type}. Should have already existing in the organization.`,
            dataSubject.type,
          );
          return;
        }

        logger.info(`Syncing data subject "${dataSubject.type}"...`);
        try {
          await syncDataSubject(client, {
            input: dataSubject,
            dataSubjectId: existing.id,
            skipPublish: !publishToPrivacyCenter,
            logger,
          });
          logger.info(`Successfully synced data subject "${dataSubject.type}"!`);
        } catch (err) {
          // supportsAuthorizedAgent is gated on the Authorized Agents feature being
          // enabled for the organization; surface a clearer hint than the raw API error
          const hint =
            dataSubject.supportsAuthorizedAgent !== undefined &&
            /authorized.agent/i.test((err as Error).message)
              ? ' (enable the Authorized Agents feature for this organization before setting "supportsAuthorizedAgent")'
              : '';
          recordError('data-subjects', `${(err as Error).message}${hint}`, dataSubject.type);
          logger.error(
            `Failed to sync data subject "${dataSubject.type}"! - ${(err as Error).message}${hint}`,
          );
        }
      },
      {
        concurrency: CONCURRENCY,
      },
    );
    logger.info(`Synced "${dataSubjects.length}" data subjects!`);
  }

  // Sync data flows
  if (dataFlows) {
    const syncedDataFlows = await syncDataFlows(client, dataFlows, { classifyService, logger });
    if (!syncedDataFlows) {
      recordError('data-flows', 'Failed to sync data-flows');
    }
  }

  // Sync privacy center
  if (privacyCenter) {
    try {
      const privacyCenterSuccess = await syncPrivacyCenter(client, privacyCenter, {
        logger,
        skipPublish: !publishToPrivacyCenter,
      });
      if (!privacyCenterSuccess) {
        recordError('privacy-center', 'Failed to sync privacy center');
      }
    } catch (err) {
      recordError('privacy-center', (err as Error).message);
    }
  }

  // Sync messages
  if (messages) {
    const messagesSuccess = await syncIntlMessages(client, messages, { logger });
    if (!messagesSuccess) {
      recordError('messages', 'Failed to sync messages');
    }
  }

  // Sync policies
  if (policies) {
    const policiesSuccess = await syncPolicies(client, policies, { logger });
    if (!policiesSuccess) {
      recordError('policies', 'Failed to sync policies');
    }
  }

  // Store dependency updates
  const dependencyUpdates: [string, DependedOnDataSiloInput[]][] = [];
  // Sync data silos
  if (dataSilos) {
    const { success, dataSiloTitleToId } = await syncDataSilos(dataSilos, client, {
      dataSubjectsByName,
      apiKeysByTitle: apiKeyTitleMap,
      pageSize,
      logger,
      progressReporter,
      onError: (message, item) => recordError('data-silos', message, item),
    });
    dataSilos?.forEach((dataSilo) => {
      // Queue up dependency update
      const dependencies = dataSilo['deletion-dependencies'];
      if (dependencies) {
        try {
          dependencyUpdates.push([
            dataSiloTitleToId[dataSilo.title]!,
            normalizeDeletionDependencies(dependencies, dataSilo.title),
          ]);
        } catch (err) {
          recordError('data-silos', (err as Error).message, dataSilo.title);
          logger.error((err as Error).message);
        }
      }
    });
    if (!success && !errors.some((error) => error.resource === 'data-silos')) {
      recordError('data-silos', 'Failed to sync data-silos');
    }
  }

  // Dependencies updated at the end after all data silos are created
  if (dependencyUpdates.length > 0) {
    const dependenciesSuccess = await syncDataSiloDependencies(client, {
      input: dependencyUpdates,
      logger,
    });
    if (!dependenciesSuccess) {
      recordError('data-silo-dependencies', 'Failed to sync data-silo-dependencies');
    }
  }

  // Update processing activities
  if (processingActivities) {
    const processingActivitySuccess = await syncProcessingActivities(client, processingActivities, {
      logger,
    });
    if (!processingActivitySuccess) {
      recordError('processing-activities', 'Failed to sync processing-activities');
    }
  }

  if (publishToPrivacyCenter) {
    // TODO: https://transcend.height.app/T-23779
  }

  return {
    success: !encounteredError,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
/* eslint-enable max-lines */
