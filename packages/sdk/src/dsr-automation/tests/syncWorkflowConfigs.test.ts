/* eslint-disable @typescript-eslint/no-explicit-any */
import { RequestAction, WorkflowConfigType } from '@transcend-io/privacy-types';
import type { GraphQLClient } from 'graphql-request';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const makeGraphQLRequest = vi.fn();
const fetchAllWorkflowConfigs = vi.fn();
const fetchAllActions = vi.fn();
const fetchAllDataSubjects = vi.fn();
const fetchAllRequestAttributeKeys = vi.fn();

vi.mock('../../api/makeGraphQLRequest.js', () => ({
  makeGraphQLRequest: (...args: unknown[]) => makeGraphQLRequest(...args),
}));

vi.mock('../fetchAllWorkflowConfigs.js', () => ({
  fetchAllWorkflowConfigs: (...args: unknown[]) => fetchAllWorkflowConfigs(...args),
}));

vi.mock('../fetchAllActions.js', () => ({
  fetchAllActions: (...args: unknown[]) => fetchAllActions(...args),
}));

vi.mock('../fetchDataSubjects.js', () => ({
  fetchAllDataSubjects: (...args: unknown[]) => fetchAllDataSubjects(...args),
}));

vi.mock('../fetchAllAttributeKeys.js', () => ({
  fetchAllRequestAttributeKeys: (...args: unknown[]) => fetchAllRequestAttributeKeys(...args),
}));

import { CREATE_WORKFLOW, UPDATE_WORKFLOW_CONFIG } from '../gqls/workflowConfig.js';
import { syncWorkflowConfigs } from '../syncWorkflowConfigs.js';

/** Minimal silent logger */
const silentLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };

/** Unused GraphQL client — requests go through the mocked helper. */
const unusedClient = {} as GraphQLClient;

describe('syncWorkflowConfigs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchAllActions.mockResolvedValue([{ type: RequestAction.Access, id: 'action-1' }]);
    fetchAllDataSubjects.mockResolvedValue([]);
    fetchAllRequestAttributeKeys.mockResolvedValue([]);
  });

  it('creates a missing workflow then updates remaining fields', async () => {
    fetchAllWorkflowConfigs.mockResolvedValue([]);
    makeGraphQLRequest.mockImplementation(async (_client, document) => {
      if (document === CREATE_WORKFLOW) {
        return {
          createWorkflow: {
            workflowConfig: { id: 'wf-new', internalName: 'new-access' },
          },
        };
      }
      if (document === UPDATE_WORKFLOW_CONFIG) {
        return { updateWorkflowConfig: { success: true } };
      }
      throw new Error('unexpected GraphQL document');
    });

    const ok = await syncWorkflowConfigs(
      unusedClient,
      [
        {
          'internal-name': 'new-access',
          'action-type': RequestAction.Access,
          title: 'New Access Workflow',
          subtitle: 'Created via CLI',
        },
      ],
      { logger: silentLogger as any },
    );

    expect(ok).toBe(true);
    expect(fetchAllWorkflowConfigs).toHaveBeenCalledWith(unusedClient, {
      logger: silentLogger,
      workflowConfigType: WorkflowConfigType.DSR,
    });
    expect(makeGraphQLRequest).toHaveBeenCalledTimes(2);
    const [createCall, updateCall] = makeGraphQLRequest.mock.calls;
    expect(createCall?.[1]).toBe(CREATE_WORKFLOW);
    expect(createCall?.[2]).toMatchObject({
      variables: {
        input: {
          title: 'New Access Workflow',
          actionType: RequestAction.Access,
          internalName: 'new-access',
          workflowConfigType: WorkflowConfigType.DSR,
        },
      },
    });
    expect(updateCall?.[1]).toBe(UPDATE_WORKFLOW_CONFIG);
    expect(updateCall?.[2]).toMatchObject({
      variables: {
        input: {
          workflowConfigId: 'wf-new',
          title: 'New Access Workflow',
          subtitle: 'Created via CLI',
          actionType: RequestAction.Access,
        },
      },
    });
  });

  it('updates an existing workflow without creating', async () => {
    fetchAllWorkflowConfigs.mockResolvedValue([
      {
        id: 'wf-existing',
        internalName: 'existing-access',
        workflowConfigType: WorkflowConfigType.DSR,
        title: { defaultMessage: 'Existing' },
        subtitle: null,
        description: null,
        workflowConfigVisibility: 'DRAFT',
        collectDataSubjectRegions: null,
        regionList: [],
        expiryTime: null,
        action: { type: RequestAction.Access },
        subject: null,
        WorkflowConfigAttributeKeys: null,
      },
    ]);
    makeGraphQLRequest.mockResolvedValue({ updateWorkflowConfig: { success: true } });

    const ok = await syncWorkflowConfigs(
      unusedClient,
      [
        {
          'internal-name': 'existing-access',
          'action-type': RequestAction.Access,
          title: 'Updated title',
        },
      ],
      { logger: silentLogger as any },
    );

    expect(ok).toBe(true);
    expect(makeGraphQLRequest).toHaveBeenCalledTimes(1);
    const [updateCall] = makeGraphQLRequest.mock.calls;
    expect(updateCall?.[1]).toBe(UPDATE_WORKFLOW_CONFIG);
    expect(updateCall?.[2]).toMatchObject({
      variables: {
        input: {
          workflowConfigId: 'wf-existing',
          title: 'Updated title',
          actionType: RequestAction.Access,
        },
      },
    });
  });

  it('rejects preference-management workflow types on create', async () => {
    fetchAllWorkflowConfigs.mockResolvedValue([]);

    const ok = await syncWorkflowConfigs(
      unusedClient,
      [
        {
          'internal-name': 'pref-workflow',
          'action-type': RequestAction.Access,
          type: WorkflowConfigType.PreferenceManagement,
        },
      ],
      { logger: silentLogger as any },
    );

    expect(ok).toBe(false);
    expect(makeGraphQLRequest).not.toHaveBeenCalled();
    expect(silentLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Only DSR workflow configs can be synced'),
    );
  });
});
