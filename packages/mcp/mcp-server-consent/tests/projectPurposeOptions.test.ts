import { describe, expect, it } from 'vitest';

import { projectPurposeOptions } from '../src/lib/projectPurposeOptions.js';

describe('projectPurposeOptions', () => {
  it('maps active purposes to slug/label options sorted by displayOrder', () => {
    expect(
      projectPurposeOptions([
        {
          trackingType: 'Analytics',
          name: 'Analytics',
          title: 'Analytics',
          isActive: true,
          deletedAt: null,
          displayOrder: 20,
        },
        {
          trackingType: 'Essential',
          name: 'Essential',
          title: null,
          isActive: true,
          deletedAt: null,
          displayOrder: 10,
        },
        {
          trackingType: 'CustomPurpose',
          name: 'Custom Purpose',
          title: 'Custom Purpose',
          isActive: true,
          deletedAt: null,
          displayOrder: 10,
        },
        {
          trackingType: 'Unknown',
          name: 'Unknown',
          title: 'Unknown',
          isActive: true,
          deletedAt: null,
          displayOrder: 1,
        },
        {
          trackingType: 'Gone',
          name: 'Gone',
          isActive: false,
          deletedAt: null,
          displayOrder: 1,
        },
        {
          trackingType: 'Deleted',
          name: 'Deleted',
          isActive: true,
          deletedAt: '2026-01-01T00:00:00.000Z',
          displayOrder: 1,
        },
      ]),
    ).toEqual([
      { slug: 'CustomPurpose', label: 'Custom Purpose' },
      { slug: 'Essential', label: 'Essential' },
      { slug: 'Analytics', label: 'Analytics' },
    ]);
  });
});
