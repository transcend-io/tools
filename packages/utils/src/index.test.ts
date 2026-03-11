import { describe, expect, it } from 'vitest';

import { describePackageName, toPackageSlug } from './index.js';

describe('toPackageSlug', () => {
  it('converts whitespace-delimited names into package slugs', () => {
    expect(toPackageSlug('  Consent Manager UI  ')).toBe('consent-manager-ui');
  });
});

describe('describePackageName', () => {
  it('returns display and slug variants', () => {
    expect(describePackageName('schema sync')).toEqual({
      displayName: 'Schema Sync',
      slug: 'schema-sync',
    });
  });
});
