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

/** Base workflow config node for sync tests */
function existingWorkflow(overrides: Record<string, unknown> = {}) {
  return {
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
    ...overrides,
  };
}

describe('syncWorkflowConfigs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchAllActions.mockResolvedValue([
      { type: RequestAction.Access, id: 'action-1' },
      { type: RequestAction.Erasure, id: 'action-2' },
    ]);
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
          internalName: 'new-access',
          actionType: RequestAction.Access,
        },
      },
    });
  });

  it('creates when internal-name is unknown without falling through to title', async () => {
    fetchAllWorkflowConfigs.mockResolvedValue([
      existingWorkflow({
        id: 'wf-other',
        internalName: 'other',
        title: { defaultMessage: 'Shared Title' },
      }),
    ]);
    makeGraphQLRequest.mockImplementation(async (_client, document) => {
      if (document === CREATE_WORKFLOW) {
        return {
          createWorkflow: {
            workflowConfig: { id: 'wf-created', internalName: 'new-internal' },
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
          'internal-name': 'new-internal',
          title: 'Shared Title',
          'action-type': RequestAction.Access,
        },
      ],
      { logger: silentLogger as any },
    );

    expect(ok).toBe(true);
    expect(makeGraphQLRequest).toHaveBeenCalledTimes(2);
    expect(makeGraphQLRequest.mock.calls[0]?.[1]).toBe(CREATE_WORKFLOW);
    expect(makeGraphQLRequest.mock.calls[1]?.[2]).toMatchObject({
      variables: {
        input: {
          workflowConfigId: 'wf-created',
        },
      },
    });
  });

  it('updates an existing workflow by internal-name without creating', async () => {
    fetchAllWorkflowConfigs.mockResolvedValue([existingWorkflow()]);
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
          internalName: 'existing-access',
          actionType: RequestAction.Access,
        },
      },
    });
  });

  it('updates by title when internal-name is omitted', async () => {
    fetchAllWorkflowConfigs.mockResolvedValue([
      existingWorkflow({
        internalName: null,
        title: { defaultMessage: 'Title Only Match' },
      }),
    ]);
    makeGraphQLRequest.mockResolvedValue({ updateWorkflowConfig: { success: true } });

    const ok = await syncWorkflowConfigs(
      unusedClient,
      [
        {
          title: 'Title Only Match',
          'action-type': RequestAction.Access,
          subtitle: 'Updated via title match',
        },
      ],
      { logger: silentLogger as any },
    );

    expect(ok).toBe(true);
    expect(makeGraphQLRequest).toHaveBeenCalledTimes(1);
    expect(makeGraphQLRequest.mock.calls[0]?.[2]).toMatchObject({
      variables: {
        input: {
          workflowConfigId: 'wf-existing',
          subtitle: 'Updated via title match',
        },
      },
    });
  });

  it('updates dogfooding workflows by region list', async () => {
    fetchAllWorkflowConfigs.mockResolvedValue([
      existingWorkflow({
        id: 'wf-empty-regions',
        internalName: null,
        title: { defaultMessage: 'dogfooding workflows' },
        subject: { id: 'sub-1', type: 'Customer' },
        regionList: [],
      }),
      existingWorkflow({
        id: 'wf-eu-regions',
        internalName: null,
        title: { defaultMessage: 'dogfooding workflows' },
        subject: { id: 'sub-1', type: 'Customer' },
        regionList: ['EU', 'AF'],
      }),
    ]);
    fetchAllDataSubjects.mockResolvedValue([{ id: 'sub-1', type: 'Customer' }]);
    makeGraphQLRequest.mockResolvedValue({ updateWorkflowConfig: { success: true } });

    const ok = await syncWorkflowConfigs(
      unusedClient,
      [
        {
          title: 'dogfooding workflows',
          'action-type': RequestAction.Access,
          'data-subject-type': 'Customer',
          'region-list': ['AF', 'EU'],
          subtitle: 'EU workflow',
        },
      ],
      { logger: silentLogger as any },
    );

    expect(ok).toBe(true);
    expect(makeGraphQLRequest).toHaveBeenCalledTimes(1);
    expect(makeGraphQLRequest.mock.calls[0]?.[2]).toMatchObject({
      variables: {
        input: {
          workflowConfigId: 'wf-eu-regions',
          subtitle: 'EU workflow',
        },
      },
    });
  });

  it('fails when duplicate internal-names remain ambiguous after the cascade', async () => {
    fetchAllWorkflowConfigs.mockResolvedValue([
      existingWorkflow({
        id: 'wf-a',
        internalName: 'dup-name',
        title: { defaultMessage: 'Ambiguous' },
        subject: { id: 'sub-1', type: 'Customer' },
        regionList: ['US'],
      }),
      existingWorkflow({
        id: 'wf-b',
        internalName: 'dup-name',
        title: { defaultMessage: 'Ambiguous' },
        subject: { id: 'sub-1', type: 'Customer' },
        regionList: ['US'],
      }),
    ]);
    fetchAllDataSubjects.mockResolvedValue([{ id: 'sub-1', type: 'Customer' }]);

    const ok = await syncWorkflowConfigs(
      unusedClient,
      [
        {
          'internal-name': 'dup-name',
          title: 'Ambiguous',
          'action-type': RequestAction.Access,
          'data-subject-type': 'Customer',
          'region-list': ['US'],
        },
      ],
      { logger: silentLogger as any },
    );

    expect(ok).toBe(false);
    expect(makeGraphQLRequest).not.toHaveBeenCalled();
    expect(silentLogger.error).toHaveBeenCalledWith(
      expect.stringContaining(
        'after applying title, action-type, data-subject-type, and region-list',
      ),
    );
  });

  it('syncs a named sibling then claims it so the unnamed pull row can match', async () => {
    fetchAllWorkflowConfigs.mockResolvedValue([
      existingWorkflow({
        id: 'wf-named',
        internalName: '(copy) test',
        title: { defaultMessage: 'test' },
        action: { type: RequestAction.Erasure },
        subject: { id: 'sub-1', type: 'employee' },
      }),
      existingWorkflow({
        id: 'wf-unnamed',
        internalName: null,
        title: { defaultMessage: 'test' },
        action: { type: RequestAction.Erasure },
        subject: { id: 'sub-1', type: 'employee' },
      }),
    ]);
    fetchAllDataSubjects.mockResolvedValue([{ id: 'sub-1', type: 'employee' }]);
    makeGraphQLRequest.mockResolvedValue({ updateWorkflowConfig: { success: true } });

    const ok = await syncWorkflowConfigs(
      unusedClient,
      [
        {
          'internal-name': '(copy) test',
          title: 'test',
          'action-type': RequestAction.Erasure,
          'data-subject-type': 'employee',
        },
        {
          title: 'test',
          'action-type': RequestAction.Erasure,
          'data-subject-type': 'employee',
        },
      ],
      { logger: silentLogger as any },
    );

    expect(ok).toBe(true);
    expect(makeGraphQLRequest).toHaveBeenCalledTimes(2);
    expect(makeGraphQLRequest.mock.calls[0]?.[2]).toMatchObject({
      variables: { input: { workflowConfigId: 'wf-named' } },
    });
    expect(makeGraphQLRequest.mock.calls[1]?.[2]).toMatchObject({
      variables: { input: { workflowConfigId: 'wf-unnamed' } },
    });
  });

  it('claims matched configs so identical unnamed rows map one-to-one in order', async () => {
    fetchAllWorkflowConfigs.mockResolvedValue([
      existingWorkflow({
        id: 'wf-a',
        internalName: null,
        title: { defaultMessage: 'Ambiguous' },
        subject: { id: 'sub-1', type: 'Customer' },
        regionList: ['US'],
      }),
      existingWorkflow({
        id: 'wf-b',
        internalName: null,
        title: { defaultMessage: 'Ambiguous' },
        subject: { id: 'sub-1', type: 'Customer' },
        regionList: ['US'],
      }),
    ]);
    fetchAllDataSubjects.mockResolvedValue([{ id: 'sub-1', type: 'Customer' }]);
    makeGraphQLRequest.mockResolvedValue({ updateWorkflowConfig: { success: true } });

    const ok = await syncWorkflowConfigs(
      unusedClient,
      [
        {
          title: 'Ambiguous',
          'action-type': RequestAction.Access,
          'data-subject-type': 'Customer',
          'region-list': ['US'],
          subtitle: 'first',
        },
        {
          title: 'Ambiguous',
          'action-type': RequestAction.Access,
          'data-subject-type': 'Customer',
          'region-list': ['US'],
          subtitle: 'second',
        },
      ],
      { logger: silentLogger as any },
    );

    expect(ok).toBe(true);
    expect(makeGraphQLRequest).toHaveBeenCalledTimes(2);
    expect(makeGraphQLRequest.mock.calls[0]?.[2]).toMatchObject({
      variables: { input: { workflowConfigId: 'wf-a', subtitle: 'first' } },
    });
    expect(makeGraphQLRequest.mock.calls[1]?.[2]).toMatchObject({
      variables: { input: { workflowConfigId: 'wf-b', subtitle: 'second' } },
    });
  });

  it('rejects preference-management workflow types on create', async () => {
    fetchAllWorkflowConfigs.mockResolvedValue([]);

    const ok = await syncWorkflowConfigs(
      unusedClient,
      [
        {
          title: 'Preference Workflow',
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
