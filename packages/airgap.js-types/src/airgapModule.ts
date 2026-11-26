import { CONSENT_MANAGER_SUPPORTED_LOCALES } from '@transcend-io/internationalization';
import { apply, fromEntries, getEntries } from '@transcend-io/type-utils';

/**
 * IAB Global Vendor List purpose translation locales bundled for TCF airgap modules.
 *
 * Only locales with both an IAB GVL translation and a Transcend TCF UI translation are included.
 *
 * Ship main's database migration and GraphQL schema before releasing a CLI or SDK that queries a new module field.
 */
export const TCF_VENDOR_LIST_TRANSLATION_LOCALES = [
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

/** IAB GVL purpose translation locale */
export type TcfVendorListTranslationLocale = (typeof TCF_VENDOR_LIST_TRANSLATION_LOCALES)[number];

/**
 * Convert an IAB GVL translation locale to a PascalCase module suffix.
 *
 * @param locale - IAB GVL translation locale
 * @returns PascalCase suffix (for example `pt-br` to `PtBr`)
 */
export function gvlLocaleToModuleSuffix(locale: string): string {
  return locale
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
}

/** Airgap module names for bundled GVL purpose translation files */
export const GvlTranslationModuleNames = fromEntries(
  TCF_VENDOR_LIST_TRANSLATION_LOCALES.map((locale) => {
    const moduleName = `tcfGvl${gvlLocaleToModuleSuffix(locale)}` as const;
    return [moduleName, moduleName] as const;
  }),
);

/** GVL translation locale keyed by airgap module name */
export const GvlTranslationModuleToLocale = fromEntries(
  TCF_VENDOR_LIST_TRANSLATION_LOCALES.map((locale) => {
    const moduleName = `tcfGvl${gvlLocaleToModuleSuffix(locale)}` as const;
    return [moduleName, locale] as const;
  }),
);

/** Required airgap module names */
export const RequiredAirgapModuleName = {
  /** Airgap.js core module */
  core: 'core',
} as const;

/** Type override */
export type RequiredAirgapModuleName =
  (typeof RequiredAirgapModuleName)[keyof typeof RequiredAirgapModuleName];

/**
 * Convert locale enums to GraphQL-friendly module name keys.
 *
 * For example `{ En: En, FrFr: FrFr, ... }`.
 */
export const TranslationEnumAirgapModuleName = apply(
  CONSENT_MANAGER_SUPPORTED_LOCALES,
  (v, k) => k,
);

export const TcfTranslationModuleNames = fromEntries(
  getEntries(CONSENT_MANAGER_SUPPORTED_LOCALES).map(([k]) => [
    `tcf${k}` as const,
    `tcf${k}` as const,
  ]),
);

export const PeripheralAirgapModuleName = {
  /** Transcend Secure XDI bundle */
  xdi: 'xdi',
  /** Transcend Consent Manager Userscript header metadata bundle */
  userscript: 'userscript',
  /** airgap.js explorer (userscript utilities) bundle */
  explorer: 'explorer',
  /** metadata about services used by airgap */
  metadata: 'metadata',
} as const;

/** Type override */
export type PeripheralAirgapModuleName =
  (typeof PeripheralAirgapModuleName)[keyof typeof PeripheralAirgapModuleName];

export const CoreUIModuleName = {
  /** Transcend Consent Manager UI bundle */
  ui: 'ui',
  /** Transcend Consent Manager UI V2 bundle */
  uiV2: 'uiV2',
  /** Transcend Consent Manager UI V2 bundle stylesheet */
  uiV2Css: 'uiV2Css',
  /** The stylesheet for the consent manager */
  stylesheet: 'stylesheet',
  /** Each translation gets its own file */
  ...TranslationEnumAirgapModuleName,
} as const;

/** Type override */
export type CoreUIModuleName = (typeof CoreUIModuleName)[keyof typeof CoreUIModuleName];

export const IABModuleName = {
  /** Transparency & Consent Framework UI bundle */
  tcfUi: 'tcfUi',
  /** GPP bundle */
  gpp: 'gpp',
  /** The stylesheet for the TCF UI */
  tcfStylesheet: 'tcfStylesheet',
  /** Transparency & Consent Framework Vendors list */
  tcfVendorsList: 'tcfVendorsList',
  ...GvlTranslationModuleNames,
  ...TcfTranslationModuleNames,
} as const;

/** Type override */
export type IABModuleName = (typeof IABModuleName)[keyof typeof IABModuleName];

export const NativeAppModuleName = {
  /** Configuration module for native apps (mobile, tvs) */
  nativeAppConfig: 'nativeAppConfig',
  /** Mobile Bridge JavaScript */
  bridgeJs: 'bridgeJs',
  /** Mobile Bridge HTML */
  bridgeHtml: 'bridgeHtml',
  /** Headless SDK config */
  mobileLoadOptions: 'mobileLoadOptions',
  /** Mobile UI SDK config */
  mobileUiLoadOptions: 'mobileUiLoadOptions',
} as const;

/** Type override */
export type NativeAppModuleName = (typeof NativeAppModuleName)[keyof typeof NativeAppModuleName];

/** Default airgap module names */
export const DefaultAirgapModuleName = {
  ...RequiredAirgapModuleName,
  ...PeripheralAirgapModuleName,
  ...CoreUIModuleName,
} as const;

/** Type override */
export type DefaultAirgapModuleName =
  (typeof DefaultAirgapModuleName)[keyof typeof DefaultAirgapModuleName];

/** Optional airgap module names */
export const OptionalAirgapModuleName = {
  ...PeripheralAirgapModuleName,
  ...CoreUIModuleName,
  ...IABModuleName,
  ...NativeAppModuleName,
} as const;

/** Type override */
export type OptionalAirgapModuleName =
  (typeof OptionalAirgapModuleName)[keyof typeof OptionalAirgapModuleName];

/** Airgap module name */
export const AirgapModuleName = {
  ...RequiredAirgapModuleName,
  ...OptionalAirgapModuleName,
} as const;

/** Type override */
export type AirgapModuleName = (typeof AirgapModuleName)[keyof typeof AirgapModuleName];
