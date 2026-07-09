import { describe, expect, it } from 'vitest';

import { resolveDisplayedChildOrganizationIds } from '../resolveDisplayedChildOrganizationIds.js';

const childOrganizations = [
  {
    id: 'org-disneyplus',
    uri: 'disneyplus-demo-thewaltdisneycompany-com',
  },
  {
    id: 'org-espn',
    uri: 'espn-demo-thewaltdisneycompany-com',
  },
  {
    id: 'org-hulu',
    uri: 'hulu-demo-thewaltdisneycompany-com',
  },
];

describe('resolveDisplayedChildOrganizationIds', () => {
  it('resolves organization URIs to IDs', () => {
    expect(
      resolveDisplayedChildOrganizationIds(childOrganizations, [
        'disneyplus-demo-thewaltdisneycompany-com',
        'espn-demo-thewaltdisneycompany-com',
      ]),
    ).toEqual(['org-disneyplus', 'org-espn']);
  });

  it('accepts organization IDs directly', () => {
    expect(
      resolveDisplayedChildOrganizationIds(childOrganizations, ['org-hulu', 'org-espn']),
    ).toEqual(['org-hulu', 'org-espn']);
  });

  it('accepts a mix of URIs and IDs', () => {
    expect(
      resolveDisplayedChildOrganizationIds(childOrganizations, [
        'org-disneyplus',
        'hulu-demo-thewaltdisneycompany-com',
      ]),
    ).toEqual(['org-disneyplus', 'org-hulu']);
  });

  it('throws a descriptive error when a URI or ID cannot be resolved', () => {
    expect(() =>
      resolveDisplayedChildOrganizationIds(childOrganizations, [
        'disneyplus-demo-thewaltdisneycompany-com',
        'missing-brand-uri',
      ]),
    ).toThrow(/Failed to resolve displayed child organization URI or ID: "missing-brand-uri"/);
  });

  it('throws when there are no child organizations available', () => {
    expect(() => resolveDisplayedChildOrganizationIds([], ['org-disneyplus'])).toThrow(
      /Available: \(none\)/,
    );
  });
});
