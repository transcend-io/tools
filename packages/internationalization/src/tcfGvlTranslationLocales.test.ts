import { describe, expect, it } from 'vitest';

import {
  IAB_PUBLISHED_GVL_TRANSLATION_TAGS,
  TCF_VENDOR_LIST_TRANSLATION_LOCALES,
} from './tcfGvlTranslationLocales.js';

describe('tcfGvlTranslationLocales', () => {
  it('keeps the full IAB allowlist after intersecting with consent-manager locales', () => {
    expect(TCF_VENDOR_LIST_TRANSLATION_LOCALES).toEqual([...IAB_PUBLISHED_GVL_TRANSLATION_TAGS]);
    expect(TCF_VENDOR_LIST_TRANSLATION_LOCALES).toHaveLength(35);
  });
});
