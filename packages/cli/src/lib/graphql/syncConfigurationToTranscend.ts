import {
  fetchAllActions,
  fetchAllAttributes,
  fetchAllDataSubjects,
  fetchApiKeys,
  fetchIdentifiersAndCreateMissing,
  syncAction,
  syncActionItemCollections,
  syncActionItems,
  syncAgentFiles,
  syncAgentFunctions,
  syncAgents,
  syncAttribute,
  syncBusinessEntities,
  syncDataCategories,
  syncConsentManager,
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
  syncPromptGroups,
  syncPromptPartials,
  syncPrompts,
  syncPreferenceOptionValues,
  syncPurposes,
  syncPreferenceTopics,
  syncTeams,
  syncTemplate,
  syncVendors,
  type Identifier,
} from '@transcend-io/sdk';
import { map, type Logger, type SyncError, type SyncResult } from '@transcend-io/utils';
import colors from 'colors';
import { GraphQLClient } from 'graphql-request';

/* eslint-disable max-lines */
import { TranscendInput } from '../../codecs.js';
import { logger } from '../../logger.js';
import { validatePreferenceManagementSlugs } from '../preference-management/validatePreferenceManagementSlugs.js';
import { ensureAllDataSubjectsExist } from './ensureAllDataSubjectsExist.js';
import { syncDataSilos } from './syncDataSilos.js';

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
  input: TranscendInput,
  client: GraphQLClient,
  {
    pageSize = 50,
    // TODO: https://transcend.height.app/T-23779
    publishToPrivacyCenter = true,
    classifyService = false,
    deleteExtraAttributeValues = false,
    logger: syncLogger,
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
    /** Non-fatal warnings to include in the result */
    warnings?: string[];
  },
): Promise<SyncResult> {
  const activeLogger = syncLogger ?? logger;
  const errors: SyncError[] = [];
  let encounteredError = false;

  const recordError = (resource: string, message: string, item?: string): void => {
    errors.push({ resource, item, message });
    encounteredError = true;
  };

  activeLogger.info(colors.magenta(`Fetching data with page size ${pageSize}...`));

  const {
    templates,
    attributes,
    actions,
    identifiers,
    'data-subjects': dataSubjects,
    'business-entities': businessEntities,
    enrichers,
    cookies,
    'consent-manager': consentManager,
    'data-silos': dataSilos,
    'data-flows': dataFlows,
    prompts,
    'prompt-groups': promptGroups,
    'prompt-partials': promptPartials,
    agents,
    'agent-functions': agentFunctions,
    'agent-files': agentFiles,
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
    enrichers || identifiers
      ? fetchIdentifiersAndCreateMissing(client, {
          input,
          skipPublish: !publishToPrivacyCenter,
          logger,
        })
      : ({} as { [k in string]: Identifier }),
    // Grab all data subjects in the organization
    dataSilos || dataSubjects || enrichers || processingActivities
      ? ensureAllDataSubjectsExist(input, client)
      : {},
    // Grab API keys
    dataSilos &&
    dataSilos
      .map((dataSilo) => dataSilo['api-key-title'] || [])
      .reduce((acc, lst) => acc + lst.length, 0) > 0
      ? fetchApiKeys(client, { apiKeyInputs: input, logger })
      : {},
  ]);

  if (preferenceOptions?.length) {
    const preferenceOptionsSuccess = await syncPreferenceOptionValues(client, preferenceOptions, {
      logger: activeLogger,
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
      { logger: activeLogger },
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
        logger: activeLogger,
        purposeIdByTrackingType,
      });
      if (!topicsSuccess) {
        recordError('preference-topics', 'Failed to sync one or more preference topics');
      }
    }
  }

  // Sync consent manager
  if (consentManager) {
    activeLogger.info(colors.magenta('Syncing consent manager...'));
    try {
      await syncConsentManager(client, consentManager, { logger: activeLogger });
      activeLogger.info(colors.green('Successfully synced consent manager!'));
    } catch (err) {
      recordError('consent-manager', (err as Error).message);
      activeLogger.error(colors.red(`Failed to sync consent manager! - ${(err as Error).message}`));
    }
  }

  // Sync prompts
  if (prompts) {
    const promptsSuccess = await syncPrompts(client, prompts, { logger });
    encounteredError = encounteredError || !promptsSuccess;
  }
  if (promptPartials) {
    const promptsSuccess = await syncPromptPartials(client, promptPartials, { logger });
    encounteredError = encounteredError || !promptsSuccess;
  }
  if (promptGroups) {
    const promptsSuccess = await syncPromptGroups(client, promptGroups, { logger });
    encounteredError = encounteredError || !promptsSuccess;
  }

  if (teams) {
    const teamsSuccess = await syncTeams(client, teams, { logger });
    encounteredError = encounteredError || !teamsSuccess;
  }

  // Sync email templates
  if (templates) {
    logger.info(colors.magenta(`Syncing "${templates.length}" email templates...`));
    await map(
      templates,
      async (template) => {
        logger.info(colors.magenta(`Syncing template "${template.title}"...`));
        try {
          await syncTemplate(client, template, { logger });
          logger.info(colors.green(`Successfully synced template "${template.title}"!`));
        } catch (err) {
          encounteredError = true;
          logger.error(colors.red(`Failed to sync template "${template.title}"! - ${err.message}`));
        }
      },
      {
        concurrency: CONCURRENCY,
      },
    );
    logger.info(colors.green(`Synced "${templates.length}" email templates!`));
  }

  // Sync business entities
  if (businessEntities) {
    const businessEntitySuccess = await syncBusinessEntities(client, businessEntities, { logger });
    encounteredError = encounteredError || !businessEntitySuccess;
  }

  // Sync vendors
  if (vendors) {
    const vendorsSuccess = await syncVendors(client, vendors, { logger });
    encounteredError = encounteredError || !vendorsSuccess;
  }

  // Sync data categories
  if (dataCategories) {
    const dataCategoriesSuccess = await syncDataCategories(client, dataCategories, { logger });
    encounteredError = encounteredError || !dataCategoriesSuccess;
  }

  // Sync processing purposes
  if (processingPurposes) {
    const processingPurposesSuccess = await syncProcessingPurposes(client, processingPurposes, {
      logger,
    });
    encounteredError = encounteredError || !processingPurposesSuccess;
  }

  // Sync partitions
  if (partitions) {
    const partitionsSuccess = await syncPartitions(client, partitions, { logger });
    encounteredError = encounteredError || !partitionsSuccess;
  }

  // Sync agents
  if (agents) {
    const agentsSuccess = await syncAgents(client, agents, { logger });
    encounteredError = encounteredError || !agentsSuccess;
  }

  // Sync agent functions
  if (agentFunctions) {
    const agentFunctionsSuccess = await syncAgentFunctions(client, agentFunctions, { logger });
    encounteredError = encounteredError || !agentFunctionsSuccess;
  }

  // Sync agent files
  if (agentFiles) {
    const agentFilesSuccess = await syncAgentFiles(client, agentFiles, { logger });
    encounteredError = encounteredError || !agentFilesSuccess;
  }

  // Sync cookies
  if (cookies) {
    const cookiesSuccess = await syncCookies(client, cookies, { logger });
    encounteredError = encounteredError || !cookiesSuccess;
  }

  // Sync action item collections
  if (actionItemCollections) {
    const actionItemCollectionsSuccess = await syncActionItemCollections(
      client,
      actionItemCollections,
      { logger },
    );
    encounteredError = encounteredError || !actionItemCollectionsSuccess;
  }

  // Sync attributes
  if (attributes) {
    // Fetch existing
    logger.info(colors.magenta(`Syncing "${attributes.length}" attributes...`));
    const existingAttributes = await fetchAllAttributes(client, { logger });
    await map(
      attributes,
      async (attribute) => {
        const existing = existingAttributes.find((attr) => attr.name === attribute.name);

        logger.info(colors.magenta(`Syncing attribute "${attribute.name}"...`));
        try {
          await syncAttribute(client, attribute, {
            existingAttribute: existing,
            deleteExtraAttributeValues,
            logger,
          });
          logger.info(colors.green(`Successfully synced attribute "${attribute.name}"!`));
        } catch (err) {
          encounteredError = true;
          logger.error(
            colors.red(`Failed to sync attribute "${attribute.name}"! - ${err.message}`),
          );
        }
      },
      {
        concurrency: CONCURRENCY,
      },
    );
    logger.info(colors.green(`Synced "${attributes.length}" attributes!`));
  }

  // Sync action items
  if (actionItems) {
    const actionItemsSuccess = await syncActionItems(client, actionItems, { logger });
    encounteredError = encounteredError || !actionItemsSuccess;
  }

  // Sync enrichers
  if (enrichers) {
    logger.info(colors.magenta(`Syncing "${enrichers.length}" enrichers...`));
    await map(
      enrichers,
      async (enricher) => {
        logger.info(colors.magenta(`Syncing enricher "${enricher.title}"...`));
        try {
          await syncEnricher(client, {
            input: enricher,
            identifierByName,
            dataSubjectsByName,
            logger,
          });
          logger.info(colors.green(`Successfully synced enricher "${enricher.title}"!`));
        } catch (err) {
          encounteredError = true;
          logger.error(colors.red(`Failed to sync enricher "${enricher.title}"! - ${err.message}`));
        }
      },
      {
        concurrency: CONCURRENCY,
      },
    );
    logger.info(colors.green(`Synced "${enrichers.length}" enrichers!`));
  }

  // Sync identifiers
  if (identifiers) {
    // Fetch existing
    logger.info(colors.magenta(`Syncing "${identifiers.length}" identifiers...`));
    await map(
      identifiers,
      async (identifier) => {
        const existing = identifierByName[identifier.name];
        if (!existing) {
          throw new Error(
            `Failed to find identifier with name: ${identifier.type}. Should have been auto-created by cli.`,
          );
        }

        logger.info(colors.magenta(`Syncing identifier "${identifier.type}"...`));
        try {
          await syncIdentifier(client, {
            input: identifier,
            dataSubjectsByName,
            identifierId: existing.id,
            skipPublish: !publishToPrivacyCenter,
            logger,
          });
          logger.info(colors.green(`Successfully synced identifier "${identifier.type}"!`));
        } catch (err) {
          encounteredError = true;
          logger.info(
            colors.red(`Failed to sync identifier "${identifier.type}"! - ${err.message}`),
          );
        }
      },
      {
        concurrency: CONCURRENCY,
      },
    );
    logger.info(colors.green(`Synced "${identifiers.length}" identifiers!`));
  }

  // Sync actions
  if (actions) {
    // Fetch existing
    logger.info(colors.magenta(`Syncing "${actions.length}" actions...`));
    const existingActions = await fetchAllActions(client, { logger });
    await map(
      actions,
      async (action) => {
        const existing = existingActions.find((act) => act.type === action.type);
        if (!existing) {
          throw new Error(
            `Failed to find action with type: ${action.type}. Should have already existing in the organization.`,
          );
        }

        logger.info(colors.magenta(`Syncing action "${action.type}"...`));
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
          logger.info(colors.green(`Successfully synced action "${action.type}"!`));
        } catch (err) {
          encounteredError = true;
          logger.error(colors.red(`Failed to sync action "${action.type}"! - ${err.message}`));
        }
      },
      {
        concurrency: CONCURRENCY,
      },
    );
    logger.info(colors.green(`Synced "${actions.length}" actions!`));
  }

  // Sync data subjects
  if (dataSubjects) {
    // Fetch existing
    logger.info(colors.magenta(`Syncing "${dataSubjects.length}" data subjects...`));
    const existingDataSubjects = await fetchAllDataSubjects(client, { logger });
    await map(
      dataSubjects,
      async (dataSubject) => {
        const existing = existingDataSubjects.find((subj) => subj.type === dataSubject.type);
        if (!existing) {
          throw new Error(
            `Failed to find data subject with type: ${dataSubject.type}. Should have already existing in the organization.`,
          );
        }

        logger.info(colors.magenta(`Syncing data subject "${dataSubject.type}"...`));
        try {
          await syncDataSubject(client, {
            input: dataSubject,
            dataSubjectId: existing.id,
            skipPublish: !publishToPrivacyCenter,
            logger,
          });
          logger.info(colors.green(`Successfully synced data subject "${dataSubject.type}"!`));
        } catch (err) {
          encounteredError = true;
          logger.info(
            colors.red(`Failed to sync data subject "${dataSubject.type}"! - ${err.message}`),
          );
        }
      },
      {
        concurrency: CONCURRENCY,
      },
    );
    logger.info(colors.green(`Synced "${dataSubjects.length}" data subjects!`));
  }

  // Sync data flows
  if (dataFlows) {
    const syncedDataFlows = await syncDataFlows(client, dataFlows, { classifyService, logger });
    encounteredError = encounteredError || !syncedDataFlows;
  }

  // Sync privacy center
  if (privacyCenter) {
    const privacyCenterSuccess = await syncPrivacyCenter(client, privacyCenter, { logger });
    encounteredError = encounteredError || !privacyCenterSuccess;
  }

  // Sync messages
  if (messages) {
    const messagesSuccess = await syncIntlMessages(client, messages, { logger });
    encounteredError = encounteredError || !messagesSuccess;
  }

  // Sync policies
  if (policies) {
    const policiesSuccess = await syncPolicies(client, policies, { logger });
    encounteredError = encounteredError || !policiesSuccess;
  }

  // Store dependency updates
  const dependencyUpdates: [string, string[]][] = [];
  // Sync data silos
  if (dataSilos) {
    const { success, dataSiloTitleToId } = await syncDataSilos(dataSilos, client, {
      dataSubjectsByName,
      apiKeysByTitle: apiKeyTitleMap,
      pageSize,
    });
    dataSilos?.forEach((dataSilo) => {
      // Queue up dependency update
      if (dataSilo['deletion-dependencies']) {
        dependencyUpdates.push([
          dataSiloTitleToId[dataSilo.title],
          dataSilo['deletion-dependencies'],
        ]);
      }
    });
    encounteredError = encounteredError || !success;
  }

  // Dependencies updated at the end after all data silos are created
  if (dependencyUpdates.length > 0) {
    await syncDataSiloDependencies(client, { input: dependencyUpdates, logger });
  }

  // Update processing activities
  if (processingActivities) {
    const processingActivitySuccess = await syncProcessingActivities(client, processingActivities, {
      logger,
    });
    encounteredError = encounteredError || !processingActivitySuccess;
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
