import { RequestAction } from '@transcend-io/privacy-types';
import { describe, expect, it } from 'vitest';

import type { WorkflowConfigNode } from '../fetchAllWorkflowConfigs.js';
import { resolveWorkflowConfigMatch } from '../resolveWorkflowConfigMatch.js';

/** Minimal workflow config node for match tests */
function workflowNode(
  overrides: Partial<WorkflowConfigNode> & Pick<WorkflowConfigNode, 'id' | 'title' | 'action'>,
): WorkflowConfigNode {
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
    ...overrides,
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

  it('returns ambiguous when the full cascade still matches multiple configs', () => {
    const resolution = resolveWorkflowConfigMatch(
      {
        title: 'Ambiguous',
        'action-type': RequestAction.Access,
        'data-subject-type': 'Customer',
        'region-list': ['US'],
      },
      existing,
    );

    expect(resolution.kind).toBe('ambiguous');
    if (resolution.kind === 'ambiguous') {
      expect(resolution.candidates.map((config) => config.id)).toEqual(['wf-7', 'wf-8']);
    }
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
