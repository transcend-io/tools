import { GraphQLClient } from 'graphql-request';

import type { TranscendInput } from '../codecs.js';
import { pullTranscendConfiguration } from '../pullTranscendConfiguration.js';
import { buildSnapshotRequest } from './buildSnapshotRequest.js';
import { planPush } from './planPush.js';
import type { PlanPushOptions, PushPlan } from './types.js';

export interface PreviewPushOptions extends PlanPushOptions {
  /** Records per API request when pulling the remote snapshot */
  pageSize?: number;
}

/**
 * Compare a parsed transcend.yml with the organization without writing anything.
 * Same logic as `transcend inventory push --dry-run`.
 *
 * @param client - GraphQL client
 * @param contents - Parsed transcend.yml
 * @param options - Pull and plan options
 * @returns What a push would create, update, or delete
 */
export async function previewPush(
  client: GraphQLClient,
  contents: TranscendInput,
  options: PreviewPushOptions = {},
): Promise<PushPlan> {
  const { pageSize = 50, deleteExtraAttributeValues = false, ...planOptions } = options;
  const remote = await pullTranscendConfiguration(client, {
    ...buildSnapshotRequest(contents),
    dataSiloIds: [],
    integrationNames: [],
    pageSize,
    debug: false,
  });
  return planPush(contents, remote, { deleteExtraAttributeValues, ...planOptions });
}
