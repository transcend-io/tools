import type { Logger } from '@transcend-io/utils';
import type { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest, NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
import { fetchAllDataSilos } from '../data-inventory/fetchAllDataSilos.js';
import { WORKFLOW_ENRICHERS, WORKFLOW_IDENTIFIERS } from './gqls/workflowConfig.js';

const PAGE_SIZE = 50;

/**
 * Pull association field values for one workflow config into transcend.yml shape.
 */
export async function pullWorkflowConfigAssociationFields(
  client: GraphQLClient,
  workflowConfigId: string,
  options: {
    pageSize?: number;
    logger?: Logger;
  } = {},
): Promise<{
  'data-silo-titles'?: string[];
  'preflight-titles'?: string[];
  'input-identifiers'?: string[];
}> {
  const { pageSize = PAGE_SIZE, logger = NOOP_LOGGER } = options;

  const [dataSilos, enrichers, identifiers] = await Promise.all([
    fetchAllDataSilos(client, { workflowConfigId, pageSize, logger }),
    fetchWorkflowEnricherTitles(client, workflowConfigId, { pageSize, logger }),
    fetchWorkflowInputIdentifierNames(client, workflowConfigId, { pageSize, logger }),
  ]);

  return {
    ...(dataSilos.length > 0 ? { 'data-silo-titles': dataSilos.map(({ title }) => title) } : {}),
    ...(enrichers.length > 0 ? { 'preflight-titles': enrichers } : {}),
    ...(identifiers.length > 0 ? { 'input-identifiers': identifiers } : {}),
  };
}

async function fetchWorkflowEnricherTitles(
  client: GraphQLClient,
  workflowConfigId: string,
  options: { pageSize: number; logger: Logger },
): Promise<string[]> {
  const titles: string[] = [];
  let offset = 0;
  let shouldContinue = false;
  do {
    const {
      workflowEnrichers: { nodes },
    } = await makeGraphQLRequest<{
      workflowEnrichers: { nodes: { id: string; title: string }[] };
    }>(client, WORKFLOW_ENRICHERS, {
      variables: {
        input: { workflowConfigId },
        first: options.pageSize,
        offset,
      },
      logger: options.logger,
    });
    titles.push(...nodes.map(({ title }) => title));
    offset += options.pageSize;
    shouldContinue = nodes.length === options.pageSize;
  } while (shouldContinue);

  return titles.sort((a, b) => a.localeCompare(b));
}

async function fetchWorkflowInputIdentifierNames(
  client: GraphQLClient,
  workflowConfigId: string,
  options: { pageSize: number; logger: Logger },
): Promise<string[]> {
  const names: string[] = [];
  let offset = 0;
  let shouldContinue = false;
  do {
    const {
      workflowIdentifiers: { nodes },
    } = await makeGraphQLRequest<{
      workflowIdentifiers: { nodes: { id: string; name: string; isDisabled: boolean }[] };
    }>(client, WORKFLOW_IDENTIFIERS, {
      variables: {
        input: { workflowConfigId },
        first: options.pageSize,
        offset,
      },
      logger: options.logger,
    });
    names.push(...nodes.filter(({ isDisabled }) => !isDisabled).map(({ name }) => name));
    offset += options.pageSize;
    shouldContinue = nodes.length === options.pageSize;
  } while (shouldContinue);

  return names.sort((a, b) => a.localeCompare(b));
}

/** Enricher id and title on a workflow (for sync diff). */
export async function fetchWorkflowConfigEnrichers(
  client: GraphQLClient,
  workflowConfigId: string,
  options: {
    pageSize?: number;
    logger?: Logger;
  } = {},
): Promise<{ id: string; title: string }[]> {
  const { pageSize = PAGE_SIZE, logger = NOOP_LOGGER } = options;
  const enrichers: { id: string; title: string }[] = [];
  let offset = 0;
  let shouldContinue = false;
  do {
    const {
      workflowEnrichers: { nodes },
    } = await makeGraphQLRequest<{
      workflowEnrichers: { nodes: { id: string; title: string }[] };
    }>(client, WORKFLOW_ENRICHERS, {
      variables: {
        input: { workflowConfigId },
        first: pageSize,
        offset,
      },
      logger,
    });
    enrichers.push(...nodes);
    offset += pageSize;
    shouldContinue = nodes.length === pageSize;
  } while (shouldContinue);

  return enrichers;
}
