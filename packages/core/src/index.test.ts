import { describe, expect, it } from 'vitest';

import { createMonorepoPackageDefinition } from './index.js';

describe('createMonorepoPackageDefinition', () => {
  it('creates scoped package metadata from human-readable input', () => {
    expect(createMonorepoPackageDefinition('Schema Sync', 'packages/schema-sync')).toEqual({
      directory: 'packages/schema-sync',
      displayName: 'Schema Sync',
      packageName: '@transcend-io/schema-sync',
    });
  });
});
