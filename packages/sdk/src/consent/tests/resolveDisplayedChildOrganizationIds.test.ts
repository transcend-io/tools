import { describe, expect, it } from 'vitest';

import { resolveDisplayedChildOrganizationIds } from '../resolveDisplayedChildOrganizationIds.js';

const childOrganizations = [
  {
    id: 'org-brand-a',
    uri: 'brand-a-demo-example-com',
  },
  {
    id: 'org-brand-b',
    uri: 'brand-b-demo-example-com',
  },
  {
    id: 'org-brand-c',
    uri: 'brand-c-demo-example-com',
  },
];

describe('resolveDisplayedChildOrganizationIds', () => {
  it('resolves organization URIs to IDs', () => {
    expect(
      resolveDisplayedChildOrganizationIds(childOrganizations, [
        'brand-a-demo-example-com',
        'brand-b-demo-example-com',
      ]),
    ).toEqual(['org-brand-a', 'org-brand-b']);
  });

  it('accepts organization IDs directly', () => {
    expect(
      resolveDisplayedChildOrganizationIds(childOrganizations, ['org-brand-c', 'org-brand-b']),
    ).toEqual(['org-brand-c', 'org-brand-b']);
  });

  it('accepts a mix of URIs and IDs', () => {
    expect(
      resolveDisplayedChildOrganizationIds(childOrganizations, [
        'org-brand-a',
        'brand-c-demo-example-com',
      ]),
    ).toEqual(['org-brand-a', 'org-brand-c']);
  });

  it('throws a descriptive error when a URI or ID cannot be resolved', () => {
    expect(() =>
      resolveDisplayedChildOrganizationIds(childOrganizations, [
        'brand-a-demo-example-com',
        'missing-brand-uri',
      ]),
    ).toThrow(/Failed to resolve displayed child organization URI or ID: "missing-brand-uri"/);
  });

  it('throws when there are no child organizations available', () => {
    expect(() => resolveDisplayedChildOrganizationIds([], ['org-brand-a'])).toThrow(
      /Available: \(none\)/,
    );
  });
});
