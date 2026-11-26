import { CONSENT_MANAGER_SUPPORTED_LOCALES } from './enums.js';

/**
 * IAB EU register GVL purpose translation locale tags.
 *
 * Only locales with both an IAB GVL translation and a Transcend TCF UI translation are included.
 *
 * Source lists:
 * - GVL: https://register.consensu.org/translations/translationsEu (ISO 639-1 two-letter language codes)
 * - TCF UI: `CONSENT_MANAGER_SUPPORTED_LOCALES`
 */
export const IAB_PUBLISHED_GVL_TRANSLATION_TAGS = [
  'ar',
  'bg',
  'bs',
  'cs',
  'da',
  'de',
  'el',
  'en',
  'es',
  'fi',
  'fr',
  'he',
  'hi',
  'hr',
  'hu',
  'id',
  'is',
  'it',
  'ja',
  'ko',
  'lt',
  'ms',
  'nl',
  'no',
  'pl',
  'pt-br',
  'ro',
  'ru',
  'sr-latn',
  'sv',
  'th',
  'tr',
  'uk',
  'vi',
  'zh',
] as const;

/** IAB GVL purpose translation locale tag */
export type IabPublishedGvlTranslationTag = (typeof IAB_PUBLISHED_GVL_TRANSLATION_TAGS)[number];

const IAB_GVL_TAG_SET = new Set<string>(IAB_PUBLISHED_GVL_TRANSLATION_TAGS);

/**
 * Map a consent-manager BCP 47 locale to a bundled IAB GVL translation locale tag.
 *
 * Mirrors transcend-io/main `frontend-support/cm-types/src/tcfGvlTranslations.ts`.
 *
 * @param locale - locale from consent manager UI
 * @returns GVL translation locale when a translation file is bundled, else undefined
 */
export function localeToGvlTranslationLocale(
  locale: string,
): IabPublishedGvlTranslationTag | undefined {
  const normalized = locale.toLowerCase();

  if (IAB_GVL_TAG_SET.has(normalized)) {
    return normalized as IabPublishedGvlTranslationTag;
  }

  const localeOverrides: Record<string, IabPublishedGvlTranslationTag> = {
    'he-il': 'he',
    'iw-il': 'he',
    iw: 'he',
    'nb-no': 'no',
    'no-no': 'no',
    'sr-latn-rs': 'sr-latn',
    'zh-cn': 'zh',
    'zh-hans': 'zh',
    'zh-hk': 'zh',
  };

  const override = localeOverrides[normalized];
  if (override) {
    return override;
  }

  const primaryLocale = normalized.split('-')[0] ?? '';
  if (primaryLocale.length > 0 && IAB_GVL_TAG_SET.has(primaryLocale)) {
    return primaryLocale as IabPublishedGvlTranslationTag;
  }

  return undefined;
}

const consentManagerGvlTags = new Set(
  Object.values(CONSENT_MANAGER_SUPPORTED_LOCALES)
    .map((locale) => localeToGvlTranslationLocale(locale))
    .filter((tag): tag is IabPublishedGvlTranslationTag => tag !== undefined),
);

/**
 * Bundled GVL tags = IAB EU allowlist intersected with consent-manager locale coverage.
 * Order follows the IAB register list.
 */
export const TCF_VENDOR_LIST_TRANSLATION_LOCALES = IAB_PUBLISHED_GVL_TRANSLATION_TAGS.filter(
  (tag) => consentManagerGvlTags.has(tag),
) as unknown as readonly IabPublishedGvlTranslationTag[];

/** IAB GVL purpose translation locale */
export type TcfVendorListTranslationLocale = (typeof TCF_VENDOR_LIST_TRANSLATION_LOCALES)[number];
