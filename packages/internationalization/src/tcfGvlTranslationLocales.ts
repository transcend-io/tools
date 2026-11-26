import { LOCALE_KEY } from './enums.js';

/**
 * {@link LOCALE_KEY} entries that have bundled IAB GVL purpose translation airgap modules.
 *
 * Only locales with both an IAB GVL translation and a Transcend TCF UI translation are included.
 */
export const TCF_VENDOR_LIST_TRANSLATION_LOCALE_KEY: readonly (keyof typeof LOCALE_KEY)[] = [
  'Ar',
  'Bg',
  'Bs',
  'Cs',
  'Da',
  'De',
  'El',
  'En',
  'Es',
  'Fi',
  'Fr',
  'He',
  'Hi',
  'Hr',
  'Hu',
  'Id',
  'Is',
  'It',
  'Ja',
  'Ko',
  'Lt',
  'Ms',
  'Nl',
  'No',
  'Pl',
  'PtBr',
  'Ro',
  'Ru',
  'SrLatn',
  'Sv',
  'Th',
  'Tr',
  'Uk',
  'Vi',
  'Zh',
];

/** {@link LOCALE_KEY} key for a bundled IAB GVL purpose translation locale */
export type TcfVendorListTranslationLocaleKey =
  (typeof TCF_VENDOR_LIST_TRANSLATION_LOCALE_KEY)[number];

/**
 * Convert a {@link LOCALE_KEY} entry to the lowercase BCP 47 tag used in GVL translation bundles.
 *
 * @param key - {@link LOCALE_KEY} key for a bundled GVL translation locale
 * @returns GVL translation file locale tag (for example `pt-br`)
 */
export function localeKeyToTcfGvlTranslationTag(key: TcfVendorListTranslationLocaleKey): string {
  return LOCALE_KEY[key].toLowerCase() as Lowercase<(typeof LOCALE_KEY)[typeof key]>;
}

/** GVL purpose translation locale tags derived from {@link LOCALE_KEY} */
export const TCF_VENDOR_LIST_TRANSLATION_LOCALES: ReadonlyArray<string> =
  TCF_VENDOR_LIST_TRANSLATION_LOCALE_KEY.map(localeKeyToTcfGvlTranslationTag);

/** IAB GVL purpose translation locale tag */
export type TcfVendorListTranslationLocale = (typeof TCF_VENDOR_LIST_TRANSLATION_LOCALES)[number];
