import type { WorkflowConfigNode } from '@transcend-io/sdk';
import { expect, describe, it, vi, afterEach } from 'vitest';

import { buildDeletionDependenciesInput } from '../graphql/buildDeletionDependencies.js';

type WorkflowConfigFixture = Pick<WorkflowConfigNode, 'internalName' | 'title'> & {
  /** ID of the workflow config */
  id: string;
};

const GDPR_ERASURE: WorkflowConfigFixture = {
  id: 'wf-gdpr',
  internalName: 'GDPR Erasure',
  title: { defaultMessage: 'GDPR Erasure' },
};

const UNNAMED_WORKFLOW: WorkflowConfigFixture = {
  id: 'wf-unnamed',
  internalName: null,
  title: { defaultMessage: 'Unnamed Erasure' },
};

const workflowConfigsById = {
  [GDPR_ERASURE.id]: GDPR_ERASURE,
  [UNNAMED_WORKFLOW.id]: UNNAMED_WORKFLOW,
};

describe('buildDeletionDependenciesInput', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('omits the field when there are no dependencies', () => {
    expect(
      buildDeletionDependenciesInput(
        {
          title: 'Salesforce',
          dependentDataSilos: [],
          dependedOnDataSilosPerWorkflow: [],
        },
        workflowConfigsById,
      ),
    ).to.deep.equal({});
  });

  it('writes global dependencies as the string shorthand', () => {
    expect(
      buildDeletionDependenciesInput(
        {
          title: 'Salesforce',
          dependentDataSilos: [{ title: 'Identity Service' }],
          dependedOnDataSilosPerWorkflow: [],
        },
        workflowConfigsById,
      ),
    ).to.deep.equal({ 'deletion-dependencies': ['Identity Service'] });
  });

  it('writes workflow overrides keyed by internal name', () => {
    expect(
      buildDeletionDependenciesInput(
        {
          title: 'Salesforce',
          dependentDataSilos: [{ title: 'Identity Service' }],
          dependedOnDataSilosPerWorkflow: [
            {
              workflowConfigId: GDPR_ERASURE.id,
              dependedOnDataSilos: [{ title: 'Identity Service' }, { title: 'CRM Warehouse' }],
            },
          ],
        },
        workflowConfigsById,
      ),
    ).to.deep.equal({
      'deletion-dependencies': [
        'Identity Service',
        { workflow: 'GDPR Erasure', titles: ['Identity Service', 'CRM Warehouse'] },
      ],
    });
  });

  it('keeps an explicit empty override distinguishable from an absent one', () => {
    expect(
      buildDeletionDependenciesInput(
        {
          title: 'Salesforce',
          dependentDataSilos: [{ title: 'Identity Service' }],
          dependedOnDataSilosPerWorkflow: [
            { workflowConfigId: GDPR_ERASURE.id, dependedOnDataSilos: [] },
          ],
        },
        workflowConfigsById,
      ),
    ).to.deep.equal({
      'deletion-dependencies': ['Identity Service', { workflow: 'GDPR Erasure', titles: [] }],
    });
  });

  it('skips overrides on workflows without an internal name', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(
      buildDeletionDependenciesInput(
        {
          title: 'Salesforce',
          dependentDataSilos: [],
          dependedOnDataSilosPerWorkflow: [
            {
              workflowConfigId: UNNAMED_WORKFLOW.id,
              dependedOnDataSilos: [{ title: 'Identity Service' }],
            },
          ],
        },
        workflowConfigsById,
      ),
    ).to.deep.equal({});
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).to.include('Unnamed Erasure');
  });

  it('skips overrides on workflows that were not fetched', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(
      buildDeletionDependenciesInput(
        {
          title: 'Salesforce',
          dependentDataSilos: [],
          dependedOnDataSilosPerWorkflow: [
            {
              workflowConfigId: 'wf-missing',
              dependedOnDataSilos: [{ title: 'Identity Service' }],
            },
          ],
        },
        workflowConfigsById,
      ),
    ).to.deep.equal({});
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).to.include('wf-missing');
  });
});
