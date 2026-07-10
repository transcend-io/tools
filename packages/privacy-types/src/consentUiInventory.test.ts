import * as either from 'fp-ts/lib/Either.js';
import { describe, expect, it } from 'vitest';

import { ConsentVariantInput, UiVariantStatus } from './consentUiInventory.js';

const baseVariant = {
  id: 'variant-1',
  name: 'Default Consent',
  slug: 'default-consent',
  status: UiVariantStatus.Published,
  locales: ['en'],
  configuration: '{}',
};

describe('ConsentVariantInput', () => {
  it('decodes a variant with a string description', () => {
    const result = ConsentVariantInput.decode({
      ...baseVariant,
      description: 'Built-in default consent UI',
    });

    expect(either.isRight(result)).toBe(true);
    if (either.isRight(result)) {
      expect(result.right.description).toBe('Built-in default consent UI');
    }
  });

  it('decodes a variant with a null description (backend unset)', () => {
    const result = ConsentVariantInput.decode({
      ...baseVariant,
      description: null,
      themeSlug: null,
      userFlow: null,
    });

    expect(either.isRight(result)).toBe(true);
    if (either.isRight(result)) {
      expect(result.right.description).toBeNull();
      expect(result.right.themeSlug).toBeNull();
      expect(result.right.userFlow).toBeNull();
    }
  });

  it('decodes a variant with description omitted', () => {
    const result = ConsentVariantInput.decode(baseVariant);

    expect(either.isRight(result)).toBe(true);
    if (either.isRight(result)) {
      expect(result.right.description).toBeUndefined();
    }
  });
});
