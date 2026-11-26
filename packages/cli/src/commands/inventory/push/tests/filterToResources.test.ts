import { TranscendPullResource, type TranscendInput } from '@transcend-io/sdk';
import { describe, expect, it } from 'vitest';

import { filterToResources } from '../helpers.js';

const input = {
  vendors: [{ title: 'Example Vendor' }],
  'data-subjects': [{ type: 'customer' }],
  enrichers: [
    {
      title: 'Example enricher',
      url: 'https://example.com/enrich',
      'input-identifier': 'email',
      'output-identifiers': ['email'],
    },
  ],
} as unknown as TranscendInput;

describe('filterToResources', () => {
  it('keeps only the named sections', () => {
    const result = filterToResources(input, [TranscendPullResource.Vendors]);
    expect(Object.keys(result)).toEqual(['vendors']);
  });

  it('maps resource names to yml section names', () => {
    const result = filterToResources(input, [TranscendPullResource.DataSubjects]);
    expect(Object.keys(result)).toEqual(['data-subjects']);
  });

  it('treats the legacy enrichers section as preflights', () => {
    const result = filterToResources(input, [TranscendPullResource.Enrichers]);
    expect(Object.keys(result)).toEqual(['preflights']);
  });

  it('does not change the input', () => {
    filterToResources(input, [TranscendPullResource.Vendors]);
    expect(Object.keys(input)).toContain('data-subjects');
  });

  it('lists every name that is missing from the file', () => {
    expect(() =>
      filterToResources(input, [
        TranscendPullResource.Vendors,
        TranscendPullResource.Teams,
        TranscendPullResource.Cookies,
      ]),
    ).toThrow('--resources named teams, cookies');
  });
});
