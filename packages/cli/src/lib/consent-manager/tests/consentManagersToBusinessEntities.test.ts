import { ConsentBundleType } from '@transcend-io/privacy-types';
import { describe, expect, it } from 'vitest';

import { consentManagersToBusinessEntities } from '../consentManagersToBusinessEntities.js';

describe('consentManagersToBusinessEntities', () => {
  it('converts consent manager configuration without logging or filesystem access', () => {
    expect(
      consentManagersToBusinessEntities([
        {
          name: 'Acme.yml',
          input: {
            domains: ['acme.com', 'acme.com'],
            bundleUrls: {
              [ConsentBundleType.Production]: 'https://cdn.example.com/airgap.js',
              [ConsentBundleType.Test]: 'https://cdn.example.com/test/airgap.js',
            },
            partition: 'acme',
          },
        },
      ]),
    ).toEqual([
      {
        title: 'Acme',
        attributes: [
          {
            key: 'Transcend Domain List',
            values: ['acme.com'],
          },
          {
            key: 'Airgap Production URL',
            values: ['https://cdn.example.com/airgap.js'],
          },
          {
            key: 'Airgap Test URL',
            values: ['https://cdn.example.com/test/airgap.js'],
          },
          {
            key: 'Airgap XDI URL',
            values: ['https://cdn.example.com/xdi.js'],
          },
          {
            key: 'Consent Partition Key',
            values: ['acme'],
          },
        ],
      },
    ]);
  });
});
