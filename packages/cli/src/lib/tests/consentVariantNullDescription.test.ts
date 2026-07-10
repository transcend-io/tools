import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { decodeCodec } from '@transcend-io/type-utils';
import { describe, expect, it } from 'vitest';

import { TranscendInput } from '../../codecs.js';
import { readTranscendYaml, writeTranscendYaml } from '../readTranscendYaml.js';

const configuration = JSON.stringify({ defaultLocale: 'en' });

/** Backend-shaped payload: unset optional fields arrive as null */
const backendShapedConsentManager = {
  'consent-manager': {
    consentVariants: [
      {
        id: 'variant-default',
        name: 'Default Consent',
        slug: 'default-consent',
        description: 'Built-in default consent UI',
        status: 'PUBLISHED',
        locales: ['en'],
        configuration,
        themeSlug: 'default-theme',
      },
      {
        id: 'variant-custom',
        name: 'Custom Banner',
        slug: 'custom-banner',
        // Backend returns null when the user never set a description
        description: null,
        status: 'DRAFT',
        locales: ['en'],
        configuration,
        themeSlug: null,
        userFlow: null,
      },
    ],
  },
};

describe('consentVariants null description', () => {
  it('decodes backend-shaped consentVariants with null description', () => {
    const decoded = decodeCodec(TranscendInput, backendShapedConsentManager, false);
    const variants = decoded['consent-manager']!.consentVariants!;

    expect(variants).toHaveLength(2);
    expect(variants[0].description).toBe('Built-in default consent UI');
    expect(variants[1].description).toBeNull();
    expect(variants[1].themeSlug).toBeNull();
    expect(variants[1].userFlow).toBeNull();
  });

  it('yaml round-trip omits null description rather than writing description: null', () => {
    const dir = mkdtempSync(join(tmpdir(), 'consent-variant-null-'));
    const filePath = join(dir, 'transcend.yml');

    try {
      const decoded = decodeCodec(TranscendInput, backendShapedConsentManager, false);
      // Mimic pull: convert null → undefined so yaml omits the key
      const pulled: TranscendInput = {
        'consent-manager': {
          consentVariants: decoded['consent-manager']!.consentVariants!.map((variant) => ({
            ...variant,
            description: variant.description || undefined,
            themeSlug: variant.themeSlug || undefined,
            userFlow: variant.userFlow || undefined,
          })),
        },
      };

      writeTranscendYaml(filePath, pulled);
      const yaml = readFileSync(filePath, 'utf-8');

      expect(yaml).toContain('description: Built-in default consent UI');
      expect(yaml).not.toMatch(/description:\s*null/);
      expect(yaml).not.toMatch(/themeSlug:\s*null/);
      expect(yaml).not.toMatch(/userFlow:\s*null/);

      const roundTripped = readTranscendYaml(filePath);
      const variants = roundTripped['consent-manager']!.consentVariants!;

      expect(variants[0].description).toBe('Built-in default consent UI');
      expect(variants[1].description).toBeUndefined();
      expect(variants[1].themeSlug).toBeUndefined();
      expect(variants[1].userFlow).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
