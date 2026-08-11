import { expect, describe, it } from 'vitest';

import type { DeletionDependencyInput } from '../../codecs.js';
import { normalizeDeletionDependencies } from '../graphql/normalizeDeletionDependencies.js';

describe('normalizeDeletionDependencies', () => {
  it('converts the string shorthand into a single global entry', () => {
    expect(
      normalizeDeletionDependencies(['Identity Service', 'CRM Warehouse'], 'Salesforce'),
    ).to.deep.equal([{ titles: ['Identity Service', 'CRM Warehouse'] }]);
  });

  it('merges the string shorthand and the object form into one global entry', () => {
    expect(
      normalizeDeletionDependencies(
        ['Identity Service', { titles: ['CRM Warehouse'] }],
        'Salesforce',
      ),
    ).to.deep.equal([{ titles: ['Identity Service', 'CRM Warehouse'] }]);
  });

  it('deduplicates global titles', () => {
    expect(
      normalizeDeletionDependencies(
        ['Identity Service', { titles: ['Identity Service', 'CRM Warehouse'] }],
        'Salesforce',
      ),
    ).to.deep.equal([{ titles: ['Identity Service', 'CRM Warehouse'] }]);
  });

  it('scopes entries with a workflow to that workflow', () => {
    expect(
      normalizeDeletionDependencies(
        [
          'Identity Service',
          { workflow: 'GDPR Erasure', titles: ['Identity Service', 'CRM Warehouse'] },
          { workflow: 'CCPA Delete', titles: ['Identity Service'] },
        ],
        'Salesforce',
      ),
    ).to.deep.equal([
      { titles: ['Identity Service'] },
      {
        workflowConfigInternalName: 'GDPR Erasure',
        titles: ['Identity Service', 'CRM Warehouse'],
      },
      { workflowConfigInternalName: 'CCPA Delete', titles: ['Identity Service'] },
    ]);
  });

  it('preserves an explicit empty override as an empty title list', () => {
    expect(
      normalizeDeletionDependencies([{ workflow: 'CCPA Delete', titles: [] }], 'Salesforce'),
    ).to.deep.equal([{ workflowConfigInternalName: 'CCPA Delete', titles: [] }]);
  });

  it('omits the global entry when only workflow overrides are given', () => {
    expect(
      normalizeDeletionDependencies(
        [{ workflow: 'GDPR Erasure', titles: ['Identity Service'] }],
        'Salesforce',
      ),
    ).to.deep.equal([{ workflowConfigInternalName: 'GDPR Erasure', titles: ['Identity Service'] }]);
  });

  it('clears the global config when given an empty global entry', () => {
    expect(normalizeDeletionDependencies([{ titles: [] }], 'Salesforce')).to.deep.equal([
      { titles: [] },
    ]);
  });

  it('sends nothing when the list is empty', () => {
    expect(normalizeDeletionDependencies([], 'Salesforce')).to.deep.equal([]);
  });

  it('converts reset-to-global into a resetToGlobal entry', () => {
    expect(
      normalizeDeletionDependencies(
        [{ workflow: 'Legacy Erasure', 'reset-to-global': true }],
        'Salesforce',
      ),
    ).to.deep.equal([{ workflowConfigInternalName: 'Legacy Erasure', resetToGlobal: true }]);
  });

  it('rejects multiple entries for the same workflow', () => {
    expect(() =>
      normalizeDeletionDependencies(
        [
          { workflow: 'GDPR Erasure', titles: ['Identity Service'] },
          { workflow: 'GDPR Erasure', titles: ['CRM Warehouse'] },
        ],
        'Salesforce',
      ),
    ).to.throw('multiple deletion-dependencies entries for workflow "GDPR Erasure"');
  });

  it('rejects reset-to-global combined with titles', () => {
    expect(() =>
      normalizeDeletionDependencies(
        [
          {
            workflow: 'GDPR Erasure',
            'reset-to-global': true,
            titles: ['Identity Service'],
          } as DeletionDependencyInput,
        ],
        'Salesforce',
      ),
    ).to.throw('sets both "reset-to-global" and "titles"');
  });
});
