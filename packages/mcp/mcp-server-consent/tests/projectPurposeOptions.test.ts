import { describe, expect, it } from 'vitest';

import { projectPurposeOptions } from '../src/lib/projectPurposeOptions.js';

describe('projectPurposeOptions', () => {
  it('maps active purposes to slugs sorted by displayOrder', () => {
    expect(
      projectPurposeOptions([
        {
          trackingType: 'Analytics',
          isActive: true,
          deletedAt: null,
          displayOrder: 20,
        },
        {
          trackingType: 'Essential',
          isActive: true,
          deletedAt: null,
          displayOrder: 10,
        },
        {
          trackingType: 'CustomPurpose',
          isActive: true,
          deletedAt: null,
          displayOrder: 10,
        },
        {
          trackingType: 'Unknown',
          isActive: true,
          deletedAt: null,
          displayOrder: 1,
        },
        {
          trackingType: 'Gone',
          isActive: false,
          deletedAt: null,
          displayOrder: 1,
        },
        {
          trackingType: 'Deleted',
          isActive: true,
          deletedAt: '2026-01-01T00:00:00.000Z',
          displayOrder: 1,
        },
      ]),
    ).toEqual(['CustomPurpose', 'Essential', 'Analytics']);
  });
});
