import { expect, describe, it } from 'vitest';

import { buildDeletionDependenciesInput } from '../graphql/buildDeletionDependencies.js';

describe('buildDeletionDependenciesInput', () => {
  it('omits the field when there are no dependencies', () => {
    expect(
      buildDeletionDependenciesInput({
        dependentDataSilos: [],
        dependedOnDataSilosPerWorkflow: [],
      }),
    ).to.deep.equal({});
  });

  it('writes global dependencies as the string shorthand', () => {
    expect(
      buildDeletionDependenciesInput({
        dependentDataSilos: [{ title: 'Identity Service' }],
        dependedOnDataSilosPerWorkflow: [],
      }),
    ).to.deep.equal({ 'deletion-dependencies': ['Identity Service'] });
  });

  it('writes workflow overrides as a full object list', () => {
    expect(
      buildDeletionDependenciesInput({
        dependentDataSilos: [{ title: 'Identity Service' }],
        dependedOnDataSilosPerWorkflow: [
          {
            workflowConfigId: 'wf-gdpr',
            workflowInternalName: 'GDPR Erasure',
            dependedOnDataSilos: [{ title: 'Identity Service' }, { title: 'CRM Warehouse' }],
          },
        ],
      }),
    ).to.deep.equal({
      'deletion-dependencies': [
        { titles: ['Identity Service'] },
        { workflow: 'GDPR Erasure', titles: ['Identity Service', 'CRM Warehouse'] },
      ],
    });
  });

  it('keeps an explicit empty override distinguishable from an absent one', () => {
    expect(
      buildDeletionDependenciesInput({
        dependentDataSilos: [{ title: 'Identity Service' }],
        dependedOnDataSilosPerWorkflow: [
          {
            workflowConfigId: 'wf-gdpr',
            workflowInternalName: 'GDPR Erasure',
            dependedOnDataSilos: [],
          },
        ],
      }),
    ).to.deep.equal({
      'deletion-dependencies': [
        { titles: ['Identity Service'] },
        { workflow: 'GDPR Erasure', titles: [] },
      ],
    });
  });

  it('omits the global object when only workflow overrides are present', () => {
    expect(
      buildDeletionDependenciesInput({
        dependentDataSilos: [],
        dependedOnDataSilosPerWorkflow: [
          {
            workflowConfigId: 'wf-gdpr',
            workflowInternalName: 'GDPR Erasure',
            dependedOnDataSilos: [{ title: 'Identity Service' }],
          },
        ],
      }),
    ).to.deep.equal({
      'deletion-dependencies': [{ workflow: 'GDPR Erasure', titles: ['Identity Service'] }],
    });
  });
});
