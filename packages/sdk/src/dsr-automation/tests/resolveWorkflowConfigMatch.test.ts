import { RequestAction } from '@transcend-io/privacy-types';
import { describe, expect, it } from 'vitest';

import type { WorkflowConfigNode } from '../fetchAllWorkflowConfigs.js';
import { resolveWorkflowConfigMatch } from '../resolveWorkflowConfigMatch.js';

/** Minimal workflow config node for match tests */
function workflowNode(
  overrides: Omit<Partial<WorkflowConfigNode>, 'action'> &
    Pick<WorkflowConfigNode, 'id' | 'title'> & {
      /** Request action (id optional in tests) */
      action: {
        /** Action ID */
        id?: string;
        /** Action type */
        type: WorkflowConfigNode['action']['type'];
      };
    },
): WorkflowConfigNode {
  const { action, ...rest } = overrides;
  return {
    subtitle: null,
    description: null,
    internalName: null,
    workflowConfigVisibility: 'DRAFT',
    workflowConfigType: 'DSR',
    collectDataSubjectRegions: null,
    regionList: [],
    expiryTime: null,
    subject: null,
    WorkflowConfigAttributeKeys: null,
    ...rest,
    action: {
      id: action.id ?? `action-${overrides.id}`,
      type: action.type,
    },
  };
}

describe('resolveWorkflowConfigMatch', () => {
  const existing: WorkflowConfigNode[] = [
    workflowNode({
      id: 'wf-1',
      internalName: 'unique-internal',
      title: { defaultMessage: 'Unique Workflow' },
      action: { type: RequestAction.Access },
    }),
    workflowNode({
      id: 'wf-2',
      title: { defaultMessage: 'Shared Title' },
      action: { type: RequestAction.Access },
    }),
    workflowNode({
      id: 'wf-3',
      title: { defaultMessage: 'Shared Title' },
      action: { type: RequestAction.Erasure },
    }),
    workflowNode({
      id: 'wf-4',
      title: { defaultMessage: 'Shared Title' },
      action: { type: RequestAction.Access },
      subject: { id: 'sub-1', type: 'Customer' },
    }),
    workflowNode({
      id: 'wf-5',
      title: { defaultMessage: 'dogfooding workflows' },
      action: { type: RequestAction.Access },
      subject: { id: 'sub-1', type: 'Customer' },
      regionList: [],
    }),
    workflowNode({
      id: 'wf-6',
      title: { defaultMessage: 'dogfooding workflows' },
      action: { type: RequestAction.Access },
      subject: { id: 'sub-1', type: 'Customer' },
      regionList: ['EU', 'AF'],
    }),
    workflowNode({
      id: 'wf-7',
      title: { defaultMessage: 'Ambiguous' },
      action: { type: RequestAction.Access },
      subject: { id: 'sub-1', type: 'Customer' },
      regionList: ['US'],
    }),
    workflowNode({
      id: 'wf-8',
      title: { defaultMessage: 'Ambiguous' },
      action: { type: RequestAction.Access },
      subject: { id: 'sub-1', type: 'Customer' },
      regionList: ['US'],
    }),
  ];

  it('matches by unique internal-name', () => {
    const resolution = resolveWorkflowConfigMatch(
      {
        'internal-name': 'unique-internal',
        title: 'Any Title',
        'action-type': RequestAction.Erasure,
      },
      existing,
    );

    expect(resolution).toEqual({ kind: 'match', config: existing[0] });
  });

  it('creates when internal-name is provided but not found', () => {
    const resolution = resolveWorkflowConfigMatch(
      {
        'internal-name': 'brand-new',
        title: 'Shared Title',
        'action-type': RequestAction.Access,
      },
      existing,
    );

    expect(resolution).toEqual({ kind: 'create' });
  });

  it('matches by title when internal-name is omitted', () => {
    const resolution = resolveWorkflowConfigMatch(
      {
        title: 'Unique Workflow',
        'action-type': RequestAction.Erasure,
      },
      existing,
    );

    expect(resolution).toEqual({ kind: 'match', config: existing[0] });
  });

  it('matches by title and action when title is duplicated', () => {
    const resolution = resolveWorkflowConfigMatch(
      {
        title: 'Shared Title',
        'action-type': RequestAction.Erasure,
      },
      existing,
    );

    expect(resolution).toEqual({ kind: 'match', config: existing[2] });
  });

  it('matches by title, action, and data subject', () => {
    const resolution = resolveWorkflowConfigMatch(
      {
        title: 'Shared Title',
        'action-type': RequestAction.Access,
        'data-subject-type': 'Customer',
      },
      existing,
    );

    expect(resolution).toEqual({ kind: 'match', config: existing[3] });
  });

  it('matches dogfooding workflows by region list', () => {
    const emptyRegions = resolveWorkflowConfigMatch(
      {
        title: 'dogfooding workflows',
        'action-type': RequestAction.Access,
        'data-subject-type': 'Customer',
        'region-list': [],
      },
      existing,
    );
    const euRegions = resolveWorkflowConfigMatch(
      {
        title: 'dogfooding workflows',
        'action-type': RequestAction.Access,
        'data-subject-type': 'Customer',
        'region-list': ['AF', 'EU'],
      },
      existing,
    );

    expect(emptyRegions).toEqual({ kind: 'match', config: existing[4] });
    expect(euRegions).toEqual({ kind: 'match', config: existing[5] });
  });

  it('picks the first unnamed candidate when multiple share the full cascade key', () => {
    const resolution = resolveWorkflowConfigMatch(
      {
        title: 'Ambiguous',
        'action-type': RequestAction.Access,
        'data-subject-type': 'Customer',
        'region-list': ['US'],
      },
      existing,
    );

    expect(resolution).toEqual({ kind: 'match', config: existing[6] });
  });

  it('prefers a null internal-name candidate when YAML omits internal-name', () => {
    const namedAndUnnamed: WorkflowConfigNode[] = [
      workflowNode({
        id: 'named',
        internalName: '(copy) test',
        title: { defaultMessage: 'test' },
        action: { type: RequestAction.Erasure },
        subject: { id: 'sub-1', type: 'employee' },
      }),
      workflowNode({
        id: 'unnamed',
        internalName: null,
        title: { defaultMessage: 'test' },
        action: { type: RequestAction.Erasure },
        subject: { id: 'sub-1', type: 'employee' },
      }),
    ];

    const resolution = resolveWorkflowConfigMatch(
      {
        title: 'test',
        'action-type': RequestAction.Erasure,
        'data-subject-type': 'employee',
      },
      namedAndUnnamed,
    );

    expect(resolution).toEqual({ kind: 'match', config: namedAndUnnamed[1] });
  });

  it('continues cascade when internal-name matches multiple configs', () => {
    const duplicateInternalName: WorkflowConfigNode[] = [
      workflowNode({
        id: 'dup-1',
        internalName: 'dup-name',
        title: { defaultMessage: 'First' },
        action: { type: RequestAction.Access },
      }),
      workflowNode({
        id: 'dup-2',
        internalName: 'dup-name',
        title: { defaultMessage: 'Second' },
        action: { type: RequestAction.Access },
      }),
    ];

    const resolution = resolveWorkflowConfigMatch(
      {
        'internal-name': 'dup-name',
        title: 'Second',
        'action-type': RequestAction.Access,
      },
      duplicateInternalName,
    );

    expect(resolution).toEqual({ kind: 'match', config: duplicateInternalName[1] });
  });
});
