import { describe, expect, it } from 'vitest';

import { formatPrivacyCenterAssetsFromGraphql } from '../formatPrivacyCenterAssetsFromGraphql.js';

describe('formatPrivacyCenterAssetsFromGraphql', () => {
  it('maps populated asset slots and drops empty slots', () => {
    expect(
      formatPrivacyCenterAssetsFromGraphql({
        favicon: {
          id: 'fav-1',
          src: 'https://cdn.example/fav.png',
          alt: { defaultMessage: 'icon' },
        },
        hero: null,
        logo: { id: 'logo-1', src: 'https://cdn.example/logo.png', alt: null },
      }),
    ).toEqual({
      favicon: { id: 'fav-1', src: 'https://cdn.example/fav.png', alt: 'icon' },
      logo: { id: 'logo-1', src: 'https://cdn.example/logo.png' },
    });
  });
});
