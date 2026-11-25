import type { LocaleKey } from '@transcend-io/internationalization';

/** Capitalize the first character when the GraphQL field starts with a lowercase letter */
export function toGraphqlFieldEnumKey(field: string): string {
  return field[0]!.toUpperCase() === field[0] ? field : field[0]!.toUpperCase() + field.slice(1);
}

/** Build a string enum object from GraphQL field names */
export function buildGraphqlFieldEnum<const T extends readonly string[]>(
  fields: T,
): { readonly [enumKey: string]: T[number] } {
  return Object.fromEntries(fields.map((field) => [toGraphqlFieldEnumKey(field), field])) as {
    readonly [enumKey: string]: T[number];
  };
}

/**
 * Message locale GraphQL fields on `AirgapBundleVersion` in `schema.graphql`.
 * Keys are a subset of `LOCALE_KEY` in `@transcend-io/internationalization`.
 */
export const AIRGAP_BUNDLE_MESSAGE_LOCALE_GRAPHQL_KEYS = [
  'En',
  'He',
  'Bs',
  'Dv',
  'Fa',
  'ArAe',
  'FrFr',
  'DeDe',
  'ItIt',
  'AfZz',
  'BgBg',
  'ZhCn',
  'ZhHans',
  'HrHr',
  'CsCz',
  'DaDk',
  'FiFi',
  'ElGr',
  'HiIn',
  'HuHu',
  'IdId',
  'JaJp',
  'KoKr',
  'LtLt',
  'MsMy',
  'MrIn',
  'NbNi',
  'PlPl',
  'PtBr',
  'RoRo',
  'RuRu',
  'SrLatnRs',
  'SvSe',
  'TaIn',
  'ThTh',
  'TrTr',
  'UkUa',
  'ViVn',
  'NlNl',
  'EsEs',
  'Es419',
  'ZhHk',
  'HeIl',
  'IsIs',
] as const satisfies readonly LocaleKey[];

/** GraphQL message locale fields; keys align with {@link AIRGAP_BUNDLE_MESSAGE_LOCALE_GRAPHQL_KEYS} */
export const TranscendAirgapBundleRollbackMessageLocaleField = buildGraphqlFieldEnum(
  AIRGAP_BUNDLE_MESSAGE_LOCALE_GRAPHQL_KEYS,
);

/** GraphQL TCF message locale fields; derived from {@link AIRGAP_BUNDLE_MESSAGE_LOCALE_GRAPHQL_KEYS} */
const AIRGAP_BUNDLE_TCF_MESSAGE_GRAPHQL_FIELDS = AIRGAP_BUNDLE_MESSAGE_LOCALE_GRAPHQL_KEYS.map(
  (key) => `tcf${key}` as const,
);

export const TranscendAirgapBundleRollbackTcfMessageField = buildGraphqlFieldEnum(
  AIRGAP_BUNDLE_TCF_MESSAGE_GRAPHQL_FIELDS,
);

/** Core airgap bundle module fields requested in rollback queries */
export const TranscendAirgapBundleRollbackBundleField = {
  /** GraphQL field `cdn` */
  Cdn: 'cdn',
  /** GraphQL field `core` */
  Core: 'core',
  /** GraphQL field `xdi` */
  Xdi: 'xdi',
  /** GraphQL field `userscript` */
  Userscript: 'userscript',
  /** GraphQL field `explorer` */
  Explorer: 'explorer',
  /** GraphQL field `metadata` */
  Metadata: 'metadata',
  /** GraphQL field `ui` */
  Ui: 'ui',
  /** GraphQL field `uiV2` */
  UiV2: 'uiV2',
  /** GraphQL field `uiV2Css` */
  UiV2Css: 'uiV2Css',
  /** GraphQL field `stylesheet` */
  Stylesheet: 'stylesheet',
} as const;

/** TCF infrastructure module fields */
export const TranscendAirgapBundleRollbackTcfInfraField = {
  /** GraphQL field `tcfUi` */
  TcfUi: 'tcfUi',
  /** GraphQL field `gpp` */
  Gpp: 'gpp',
  /** GraphQL field `tcfStylesheet` */
  TcfStylesheet: 'tcfStylesheet',
  /** GraphQL field `tcfVendorsList` */
  TcfVendorsList: 'tcfVendorsList',
} as const;

/** TCF Global Vendor List locale fields */
export const TranscendAirgapBundleRollbackTcfGvlField = {
  /** GraphQL field `tcfGvlAr` */
  TcfGvlAr: 'tcfGvlAr',
  /** GraphQL field `tcfGvlBg` */
  TcfGvlBg: 'tcfGvlBg',
  /** GraphQL field `tcfGvlBs` */
  TcfGvlBs: 'tcfGvlBs',
  /** GraphQL field `tcfGvlCs` */
  TcfGvlCs: 'tcfGvlCs',
  /** GraphQL field `tcfGvlDa` */
  TcfGvlDa: 'tcfGvlDa',
  /** GraphQL field `tcfGvlDe` */
  TcfGvlDe: 'tcfGvlDe',
  /** GraphQL field `tcfGvlEl` */
  TcfGvlEl: 'tcfGvlEl',
  /** GraphQL field `tcfGvlEn` */
  TcfGvlEn: 'tcfGvlEn',
  /** GraphQL field `tcfGvlEs` */
  TcfGvlEs: 'tcfGvlEs',
  /** GraphQL field `tcfGvlFi` */
  TcfGvlFi: 'tcfGvlFi',
  /** GraphQL field `tcfGvlFr` */
  TcfGvlFr: 'tcfGvlFr',
  /** GraphQL field `tcfGvlHe` */
  TcfGvlHe: 'tcfGvlHe',
  /** GraphQL field `tcfGvlHi` */
  TcfGvlHi: 'tcfGvlHi',
  /** GraphQL field `tcfGvlHr` */
  TcfGvlHr: 'tcfGvlHr',
  /** GraphQL field `tcfGvlHu` */
  TcfGvlHu: 'tcfGvlHu',
  /** GraphQL field `tcfGvlId` */
  TcfGvlId: 'tcfGvlId',
  /** GraphQL field `tcfGvlIs` */
  TcfGvlIs: 'tcfGvlIs',
  /** GraphQL field `tcfGvlIt` */
  TcfGvlIt: 'tcfGvlIt',
  /** GraphQL field `tcfGvlJa` */
  TcfGvlJa: 'tcfGvlJa',
  /** GraphQL field `tcfGvlKo` */
  TcfGvlKo: 'tcfGvlKo',
  /** GraphQL field `tcfGvlLt` */
  TcfGvlLt: 'tcfGvlLt',
  /** GraphQL field `tcfGvlMs` */
  TcfGvlMs: 'tcfGvlMs',
  /** GraphQL field `tcfGvlNl` */
  TcfGvlNl: 'tcfGvlNl',
  /** GraphQL field `tcfGvlNo` */
  TcfGvlNo: 'tcfGvlNo',
  /** GraphQL field `tcfGvlPl` */
  TcfGvlPl: 'tcfGvlPl',
  /** GraphQL field `tcfGvlPtBr` */
  TcfGvlPtBr: 'tcfGvlPtBr',
  /** GraphQL field `tcfGvlRo` */
  TcfGvlRo: 'tcfGvlRo',
  /** GraphQL field `tcfGvlRu` */
  TcfGvlRu: 'tcfGvlRu',
  /** GraphQL field `tcfGvlSrLatn` */
  TcfGvlSrLatn: 'tcfGvlSrLatn',
  /** GraphQL field `tcfGvlSv` */
  TcfGvlSv: 'tcfGvlSv',
  /** GraphQL field `tcfGvlTh` */
  TcfGvlTh: 'tcfGvlTh',
  /** GraphQL field `tcfGvlTr` */
  TcfGvlTr: 'tcfGvlTr',
  /** GraphQL field `tcfGvlUk` */
  TcfGvlUk: 'tcfGvlUk',
  /** GraphQL field `tcfGvlVi` */
  TcfGvlVi: 'tcfGvlVi',
  /** GraphQL field `tcfGvlZh` */
  TcfGvlZh: 'tcfGvlZh',
} as const;

/** Mobile and sync module fields */
export const TranscendAirgapBundleRollbackMobileField = {
  /** GraphQL field `nativeAppConfig` */
  NativeAppConfig: 'nativeAppConfig',
  /** GraphQL field `bridgeJs` */
  BridgeJs: 'bridgeJs',
  /** GraphQL field `bridgeHtml` */
  BridgeHtml: 'bridgeHtml',
  /** GraphQL field `mobileLoadOptions` */
  MobileLoadOptions: 'mobileLoadOptions',
  /** GraphQL field `mobileUiLoadOptions` */
  MobileUiLoadOptions: 'mobileUiLoadOptions',
  /** GraphQL field `sync` */
  Sync: 'sync',
  /** GraphQL field `isTest` */
  IsTest: 'isTest',
} as const;

/** All GraphQL field names on airgap bundle version nodes used for rollback */
export const AIRGAP_BUNDLE_ROLLBACK_FIELDS = [
  ...Object.values(TranscendAirgapBundleRollbackBundleField),
  ...Object.values(TranscendAirgapBundleRollbackMessageLocaleField),
  ...Object.values(TranscendAirgapBundleRollbackTcfInfraField),
  ...Object.values(TranscendAirgapBundleRollbackTcfGvlField),
  ...Object.values(TranscendAirgapBundleRollbackTcfMessageField),
  ...Object.values(TranscendAirgapBundleRollbackMobileField),
] as const;

/** Values of {@link AIRGAP_BUNDLE_ROLLBACK_FIELDS} */
export type TranscendAirgapBundleRollbackFieldValue =
  (typeof AIRGAP_BUNDLE_ROLLBACK_FIELDS)[number];
