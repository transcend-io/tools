import { RequestAction } from '@transcend-io/privacy-types';
import { describe, expect, it } from 'vitest';

import {
  getWorkflowConfigDisplayTitle,
  resolveWorkflowConfigByTitle,
  type WorkflowConfigSummary,
} from '../../dsr-automation/fetchAllWorkflowConfigs.js';
import {
  buildTriggerConditionFromPurposes,
  isConsentWorkflowTriggerV2Mode,
  parsePurposesFromTriggerCondition,
  resolveWorkflowTitleFromId,
  validateConsentWorkflowTriggerMode,
} from '../syncConsentWorkflowTriggers.js';

describe('buildTriggerConditionFromPurposes', () => {
  it('builds And expression matching admin dashboard shape', () => {
    expect(
      buildTriggerConditionFromPurposes([
        { 'tracking-type': 'Marketing', 'matching-state': false },
        { 'tracking-type': 'Analytics', 'matching-state': true },
      ]),
    ).toBe(JSON.stringify({ And: [{ Marketing: false }, { Analytics: true }] }));
  });
});

describe('parsePurposesFromTriggerCondition', () => {
  it('parses And entries into purposes', () => {
    expect(
      parsePurposesFromTriggerCondition(
        JSON.stringify({ And: [{ Marketing: false }, { Analytics: true }] }),
      ),
    ).toEqual([
      { 'tracking-type': 'Marketing', 'matching-state': false },
      { 'tracking-type': 'Analytics', 'matching-state': true },
    ]);
  });

  it('round-trips with buildTriggerConditionFromPurposes', () => {
    const purposes = [{ 'tracking-type': 'SaleOfInfo', 'matching-state': false }] as const;
    const json = buildTriggerConditionFromPurposes([...purposes]);
    expect(parsePurposesFromTriggerCondition(json)).toEqual([...purposes]);
  });

  it('returns empty for null, invalid JSON, or unexpected shapes', () => {
    expect(parsePurposesFromTriggerCondition(null)).toEqual([]);
    expect(parsePurposesFromTriggerCondition(undefined)).toEqual([]);
    expect(parsePurposesFromTriggerCondition('not-json')).toEqual([]);
    expect(parsePurposesFromTriggerCondition(JSON.stringify({ Or: [{ X: true }] }))).toEqual([]);
    expect(parsePurposesFromTriggerCondition(JSON.stringify({ And: 'nope' }))).toEqual([]);
    expect(parsePurposesFromTriggerCondition(JSON.stringify({ And: null }))).toEqual([]);
    expect(parsePurposesFromTriggerCondition(JSON.stringify({ And: [null, 'x', []] }))).toEqual([]);
  });

  it('skips non-boolean matching states', () => {
    expect(
      parsePurposesFromTriggerCondition(
        JSON.stringify({ And: [{ Marketing: 'false' }, { Analytics: true }] }),
      ),
    ).toEqual([{ 'tracking-type': 'Analytics', 'matching-state': true }]);
  });
});

const purposes = [{ 'tracking-type': 'Analytics', 'matching-state': false }];

describe('isConsentWorkflowTriggerV2Mode', () => {
  it('detects workflow-title', () => {
    expect(isConsentWorkflowTriggerV2Mode({ 'workflow-title': 'Erasure' })).toBe(true);
    expect(isConsentWorkflowTriggerV2Mode({})).toBe(false);
    expect(isConsentWorkflowTriggerV2Mode({ 'workflow-title': '' })).toBe(false);
  });
});

describe('validateConsentWorkflowTriggerMode', () => {
  it('requires non-empty purposes', () => {
    expect(() =>
      validateConsentWorkflowTriggerMode(
        { name: 'T', purposes: [], 'action-type': RequestAction.Erasure },
        { isUpdate: false },
      ),
    ).toThrow(/non-empty "purposes"/);
  });

  it('rejects mixing workflow-title with action-type', () => {
    expect(() =>
      validateConsentWorkflowTriggerMode(
        {
          name: 'T',
          purposes,
          'workflow-title': 'Customer Erasure',
          'action-type': RequestAction.Erasure,
        },
        { isUpdate: false },
      ),
    ).toThrow(/cannot set "workflow-title" together with/);
  });

  it('rejects mixing workflow-title with data-silo-titles', () => {
    expect(() =>
      validateConsentWorkflowTriggerMode(
        {
          name: 'T',
          purposes,
          'workflow-title': 'Customer Erasure',
          'data-silo-titles': ['Salesforce'],
        },
        { isUpdate: true },
      ),
    ).toThrow(/cannot set "workflow-title" together with/);
  });

  it('requires action-type and data-subject-type on legacy create', () => {
    expect(() =>
      validateConsentWorkflowTriggerMode(
        { name: 'T', purposes, 'data-subject-type': 'customer' },
        { isUpdate: false },
      ),
    ).toThrow(/requires "action-type"/);

    expect(() =>
      validateConsentWorkflowTriggerMode(
        { name: 'T', purposes, 'action-type': RequestAction.Erasure },
        { isUpdate: false },
      ),
    ).toThrow(/requires "data-subject-type"/);
  });

  it('allows V2 create with only workflow-title', () => {
    expect(() =>
      validateConsentWorkflowTriggerMode(
        { name: 'T', purposes, 'workflow-title': 'Customer Erasure' },
        { isUpdate: false },
      ),
    ).not.toThrow();
  });

  it('allows legacy update without action-type', () => {
    expect(() =>
      validateConsentWorkflowTriggerMode(
        { name: 'T', purposes, 'is-active': false },
        { isUpdate: true },
      ),
    ).not.toThrow();
  });
});

describe('workflow title resolution', () => {
  const baseFields = {
    subtitle: null,
    description: null,
    workflowConfigVisibility: 'DRAFT' as WorkflowConfigSummary['workflowConfigVisibility'],
    collectDataSubjectRegions: null,
    regionList: [] as WorkflowConfigSummary['regionList'],
    expiryTime: null,
    WorkflowConfigAttributeKeys: null,
  };

  const workflows: WorkflowConfigSummary[] = [
    {
      ...baseFields,
      id: 'wf-1',
      internalName: 'Customer Erasure',
      title: { defaultMessage: 'Erase Customer Data' },
      action: { id: 'a1', type: RequestAction.Erasure },
      subject: { id: 's1', type: 'customer' },
      workflowConfigType: 'DSR' as WorkflowConfigSummary['workflowConfigType'],
    },
    {
      ...baseFields,
      id: 'wf-2',
      internalName: null,
      title: { defaultMessage: 'Access Request' },
      action: { id: 'a2', type: RequestAction.Access },
      subject: { id: 's1', type: 'customer' },
      workflowConfigType: 'DSR' as WorkflowConfigSummary['workflowConfigType'],
    },
  ];

  it('prefers internalName for display title', () => {
    const [withInternal, withoutInternal] = workflows;
    expect(getWorkflowConfigDisplayTitle(withInternal!)).toBe('Customer Erasure');
    expect(getWorkflowConfigDisplayTitle(withoutInternal!)).toBe('Access Request');
  });

  it('resolves by display title', () => {
    expect(resolveWorkflowConfigByTitle(workflows, 'Customer Erasure').id).toBe('wf-1');
    expect(resolveWorkflowConfigByTitle(workflows, 'Access Request').id).toBe('wf-2');
  });

  it('throws when workflow title is missing or duplicated', () => {
    expect(() => resolveWorkflowConfigByTitle(workflows, 'Missing')).toThrow(
      /Failed to find DSR workflow/,
    );
    const first = workflows[0]!;
    const dupes: WorkflowConfigSummary[] = [
      first,
      { ...first, id: 'wf-dup', title: { defaultMessage: 'Other' } },
    ];
    expect(() => resolveWorkflowConfigByTitle(dupes, 'Customer Erasure')).toThrow(
      /multiple DSR workflows/,
    );
  });

  it('resolves title from workflowConfigId', () => {
    expect(resolveWorkflowTitleFromId(workflows, 'wf-1')).toBe('Customer Erasure');
    expect(resolveWorkflowTitleFromId(workflows, 'wf-2')).toBe('Access Request');
    expect(resolveWorkflowTitleFromId(workflows, 'missing')).toBeUndefined();
    expect(resolveWorkflowTitleFromId(workflows, null)).toBeUndefined();
  });
});
