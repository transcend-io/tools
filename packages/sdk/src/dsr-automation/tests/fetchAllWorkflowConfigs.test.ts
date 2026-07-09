import { RequestAction, WorkflowConfigType } from '@transcend-io/privacy-types';
import { describe, expect, it } from 'vitest';

import {
  getWorkflowConfigDisplayTitle,
  resolveWorkflowConfigByTitle,
  type WorkflowConfigSummary,
} from '../fetchAllWorkflowConfigs.js';

const baseWorkflow = (
  overrides: Partial<WorkflowConfigSummary> & Pick<WorkflowConfigSummary, 'id'>,
): WorkflowConfigSummary => ({
  internalName: null,
  title: { defaultMessage: 'Default Title' },
  action: { id: 'a1', type: RequestAction.Erasure },
  subject: { id: 's1', type: 'customer' },
  workflowConfigType: WorkflowConfigType.DSR,
  ...overrides,
});

describe('getWorkflowConfigDisplayTitle', () => {
  it('uses internalName when set', () => {
    expect(
      getWorkflowConfigDisplayTitle(
        baseWorkflow({ id: '1', internalName: 'Internal', title: { defaultMessage: 'External' } }),
      ),
    ).toBe('Internal');
  });

  it('falls back to external title', () => {
    expect(
      getWorkflowConfigDisplayTitle(
        baseWorkflow({ id: '1', internalName: null, title: { defaultMessage: 'External' } }),
      ),
    ).toBe('External');
  });
});

describe('resolveWorkflowConfigByTitle', () => {
  const workflows = [
    baseWorkflow({ id: '1', internalName: 'Alpha', title: { defaultMessage: 'A' } }),
    baseWorkflow({ id: '2', title: { defaultMessage: 'Beta' } }),
  ];

  it('matches internalName or external title', () => {
    expect(resolveWorkflowConfigByTitle(workflows, 'Alpha').id).toBe('1');
    expect(resolveWorkflowConfigByTitle(workflows, 'Beta').id).toBe('2');
  });

  it('errors when not found', () => {
    expect(() => resolveWorkflowConfigByTitle(workflows, 'Nope')).toThrow(/Failed to find/);
  });
});
