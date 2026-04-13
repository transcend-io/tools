/* eslint-disable max-lines */

/**
 * The locale identifier keys
 *
 * NOTE: For every 4+ char locale below (e.g. "fr-FR"), there is a
 * corresponding 2-char base locale (e.g. "fr") present in LOCALE_KEY.
 *
 * @see https://en.wikipedia.org/wik i/List-of-ISO-639-1-codes
 */
export const LOCALE_KEY = {
  /* ===== Base (2-char) locales ===== */
  /** English */
  En: 'en',
  /** Arabic */
  Ar: 'ar',
  /** French */
  Fr: 'fr',
  /** Spanish */
  Es: 'es',
  /** German */
  De: 'de',
  /** Italian */
  It: 'it',
  /** Japanese */
  Ja: 'ja',
  /** Russian */
  Ru: 'ru',
  /** Afrikaans */
  Af: 'af',
  /** Bulgarian */
  Bg: 'bg',
  /** Chinese (base) */
  Zh: 'zh',
  /** Croatian */
  Hr: 'hr',
  /** Czech */
  Cs: 'cs',
  /** Danish */
  Da: 'da',
  /** Finnish */
  Fi: 'fi',
  /** Greek */
  El: 'el',
  /** Hindi */
  Hi: 'hi',
  /** Hungarian */
  Hu: 'hu',
  /** Indonesian */
  // TODO: https://linear.app/transcend/issue/GOOM-417/add-id-to-locale-key
  // Id: 'id',
  /** Korean */
  Ko: 'ko',
  /** Lithuanian */
  Lt: 'lt',
  /** Malay */
  Ms: 'ms',
  /** Marathi */
  Mr: 'mr',
  /** Norwegian Bokmål */
  Nb: 'nb',
  /** Polish */
  Pl: 'pl',
  /** Portuguese */
  Pt: 'pt',
  /** Romanian */
  Ro: 'ro',
  /** Serbian (unspecified script) */
  Sr: 'sr',
  /** Swedish */
  Sv: 'sv',
  /** Tamil */
  Ta: 'ta',
  /** Thai */
  Th: 'th',
  /** Turkish */
  Tr: 'tr',
  /** Ukrainian */
  Uk: 'uk',
  /** Vietnamese */
  Vi: 'vi',
  /** Zulu */
  Zu: 'zu',
  /** Hebrew */
  He: 'he',
  /** Dutch */
  Nl: 'nl',
  /** Estonian */
  Et: 'et',
  /** Icelandic */
  Is: 'is',
  /** Latvian */
  Lv: 'lv',
  /** Maltese */
  Mt: 'mt',
  /** Slovak */
  Sk: 'sk',
  /** Slovenian */
  Sl: 'sl',
  /** Filipino */
  Fil: 'fil',
  /** Bosnian */
  Bs: 'bs',
  /** Catalan */
  Ca: 'ca',
  /** Basque */
  Eu: 'eu',
  /** Galician */
  Gl: 'gl',
  /** Dhivehi */
  Dv: 'dv',
  /** Urdu */
  Ur: 'ur',
  /** Albanian */
  Sq: 'sq',
  /** Amharic */
  Am: 'am',
  /** Armenian */
  Hy: 'hy',
  /** Azerbaijani */
  Az: 'az',
  /** Bengali */
  Bn: 'bn',
  /** Dari */
  FaAf: 'fa-AF',
  /** Tagalog */
  Tl: 'tl',
  /** Georgian */
  Ka: 'ka',
  /** Gujarati */
  Gu: 'gu',
  /** Haitian Creole */
  Ht: 'ht',
  /** Hausa */
  Ha: 'ha',
  /** Irish */
  Ga: 'ga',
  /** Kannada */
  Kn: 'kn',
  /** Kazakh */
  Kk: 'kk',
  /** Macedonian */
  Mk: 'mk',
  /** Malayalam */
  Ml: 'ml',
  /** Mongolian */
  Mn: 'mn',
  /** Pashto */
  Ps: 'ps',
  /** Punjabi */
  Pa: 'pa',
  /** Sinhala */
  Si: 'si',
  /** Somali */
  So: 'so',
  /** Swahili */
  Sw: 'sw',
  /** Telugu */
  Te: 'te',
  /** Uzbek */
  Uz: 'uz',
  /** Welsh */
  Cy: 'cy',

  /* ===== Region/script variants (4+ char) ===== */
  /** Arabic UAE */
  ArAe: 'ar-AE',
  /** French (France) */
  FrFr: 'fr-FR',
  /** German (Germany) */
  DeDe: 'de-DE',
  /** Austrian German */
  DeAt: 'de-AT',
  /** Swiss German */
  DeCh: 'de-CH',
  /** Italian (Italy) */
  ItIt: 'it-IT',
  /** Swiss Italian */
  ItCh: 'it-CH',
  /** Afrikaans (South Africa) */
  AfZz: 'af-ZA',
  /** Bulgarian (Bulgaria) */
  BgBg: 'bg-BG',
  /** Chinese (Simplified, China) */
  ZhCn: 'zh-CN',
  /** Chinese (Traditional, Taiwan) */
  ZhTw: 'zh-TW',
  /** Chinese (Simplified) */
  ZhHans: 'zh-Hans',
  /** Croatian (Croatia) */
  HrHr: 'hr-HR',
  /** Czech (Czechia) */
  CsCz: 'cs-CZ',
  /** Danish (Denmark) */
  DaDk: 'da-DK',
  /** English (UK) */
  EnGb: 'en-GB',
  /** English (Canada) */
  EnCa: 'en-CA',
  /** English (UAE) */
  EnAe: 'en-AE',
  /** Finnish (Finland) */
  FiFi: 'fi-FI',
  /** Greek (Greece) */
  ElGr: 'el-GR',
  /** Hindi (India) */
  HiIn: 'hi-IN',
  /** Hungarian (Hungary) */
  HuHu: 'hu-HU',
  /** Indonesian (Indonesia) */
  IdId: 'id-ID',
  /** Japanese (Japan) */
  JaJp: 'ja-JP',
  /** Korean (South Korea) */
  KoKr: 'ko-KR',
  /** Lithuanian (Lithuania) */
  LtLt: 'lt-LT',
  /** Malay (Malaysia) */
  MsMy: 'ms-MY',
  /** Malay (Singapore) */
  MsSg: 'ms-SG',
  /** Marathi (India) */
  MrIn: 'mr-IN',
  /** Norwegian Bokmål (Norway) */
  NbNi: 'nb-NO',
  /** Polish (Poland) */
  PlPl: 'pl-PL',
  /** Portuguese (Brazil) */
  PtBr: 'pt-BR',
  /** Portuguese (Portugal) */
  PtPt: 'pt-PT',
  /** Romanian (Romania) */
  RoRo: 'ro-RO',
  /** Russian (Russia) */
  RuRu: 'ru-RU',
  /** Serbian (Latin, Serbia) */
  SrLatnRs: 'sr-Latn-RS',
  /** Serbian (Cyrillic, Serbia) */
  SrCyrlRs: 'sr-Cyrl-RS',
  /** Swedish (Sweden) */
  SvSe: 'sv-SE',
  /** Tamil (India) */
  TaIn: 'ta-IN',
  /** Thai (Thailand) */
  ThTh: 'th-TH',
  /** Turkish (Turkey) */
  TrTr: 'tr-TR',
  /** Ukrainian (Ukraine) */
  UkUa: 'uk-UA',
  /** Vietnamese (Vietnam) */
  ViVn: 'vi-VN',
  /** Zulu (South Africa) */
  ZuZa: 'zu-ZA',
  /** English (United States) */
  EnUs: 'en-US',
  /** English (Australia) */
  EnAu: 'en-AU',
  /** French (Belgium) */
  FrBe: 'fr-BE',
  /** French (Canada/Québec) */
  FrCa: 'fr-CA',
  /** French (Switzerland) */
  FrCh: 'fr-CH',
  /** English (Ireland) */
  EnIe: 'en-IE',
  /** Dutch (Netherlands) */
  NlNl: 'nl-NL',
  /** Dutch (Belgium) */
  NlBe: 'nl-BE',
  /** Spanish (Spain) */
  EsEs: 'es-ES',
  /** Spanish (Argentina) */
  EsAr: 'es-AR',
  /** Spanish (Costa Rica) */
  EsCr: 'es-CR',
  /** Spanish (Chile) */
  EsCl: 'es-CL',
  /** Spanish (Colombia) */
  EsCo: 'es-CO',
  /** Spanish (Mexico) */
  EsMx: 'es-MX',
  /** Spanish (Latin America & Caribbean) */
  Es419: 'es-419',
  /** Chinese (Traditional, Hong Kong) */
  ZhHk: 'zh-HK',
  /** Hebrew (Israel) */
  HeIl: 'he-IL',
  /** English (New Zealand) */
  EnNz: 'en-NZ',
  /** Estonian (Estonia) */
  EtEe: 'et-EE',
  /** Icelandic (Iceland) */
  IsIs: 'is-IS',
  /** Latvian (Latvia) */
  LvLv: 'lv-LV',
  /** Maltese (Malta) */
  MtMt: 'mt-MT',
  /** Slovak (Slovakia) */
  SkSk: 'sk-SK',
  /** Slovenian (Slovenia) */
  SlSl: 'sl-SL',
  /** Filipino (Philippines) */
  FilPh: 'fil-PH',
  /** Albanian (Albania) */
  SqAl: 'sq-AL',
  /** Albanian (Macedonia) */
  SqMk: 'sq-MK',
  /** Albanian (Kosovo) */
  SqXk: 'sq-XK',
  /** Amharic (Ethiopia) */
  AmEt: 'am-ET',
  /** Armenian (Armenia) */
  HyAm: 'hy-AM',
  /** Azerbaijani (Azerbaijan) */
  AzAz: 'az-AZ',
  /** Bengali (Bangladesh) */
  BnBd: 'bn-BD',
  /** Bengali (India) */
  BnIn: 'bn-IN',
  /** Bosnian (Bosnia and Herzegovina) */
  BsBa: 'bs-BA',
  /** Bosnian (Cyrillic, Bosnia and Herzegovina) */
  BsCyrlBa: 'bs-Cyrl-BA',
  /** Bosnian (Latin, Bosnia and Herzegovina) */
  BsLatnBa: 'bs-Latn-BA',
  /** Catalan (Spain) */
  CaEs: 'ca-ES',
  /** Catalan (Andorra) */
  CaAd: 'ca-AD',
  /** Catalan (France) */
  CaFr: 'ca-FR',
  /** Catalan (Italy) */
  CaIt: 'ca-IT',
  /** Tagalog (Philippines) */
  TlPh: 'tl-PH',
  /** Georgian (Georgia) */
  KaGe: 'ka-GE',
  /** Gujarati (India) */
  GuIn: 'gu-IN',
  /** Haitian Creole (Haiti) */
  HtHt: 'ht-HT',
  /** Hausa (Nigeria) */
  HaNg: 'ha-NG',
  /** Hausa (Niger) */
  HaNe: 'ha-NE',
  /** Hausa (Ghana) */
  HaGh: 'ha-GH',
  /** Irish (Ireland) */
  GaIe: 'ga-IE',
  /** Kannada (India) */
  KnIn: 'kn-IN',
  /** Kazakh (Kazakhstan) */
  KkKz: 'kk-KZ',
  /** Macedonian (North Macedonia) */
  MkMk: 'mk-MK',
  /** Malayalam (India) */
  MlIn: 'ml-IN',
  /** Mongolian (Mongolia) */
  MnMn: 'mn-MN',
  /** Pashto (Afghanistan) */
  PsAf: 'ps-AF',
  /** Punjabi (India) */
  PaIn: 'pa-Guru-IN',
  /** Punjabi (Pakistan) */
  PaPk: 'pa-Arab-PK',
  /** Sinhala (Sri Lanka) */
  SiLk: 'si-LK',
  /** Somali (Somalia) */
  SoSo: 'so-SO',
  /** Somali (Djibouti) */
  SoDj: 'so-DJ',
  /** Somali (Ethiopia) */
  SoEt: 'so-ET',
  /** Somali (Kenya) */
  SoKe: 'so-KE',
  /** Swahili (Kenya) */
  SwKe: 'sw-KE',
  /** Swahili (Tanzania) */
  SwTz: 'sw-TZ',
  /** Swahili (Uganda) */
  SwUg: 'sw-UG',
  /** Swahili (Congo - Kinshasa) */
  SwCd: 'sw-CD',
  /** Telugu (India) */
  TeIn: 'te-IN',
  /** Urdu (Pakistan) */
  UrPk: 'ur-PK',
  /** Urdu (India) */
  UrIn: 'ur-IN',
  /** Uzbek (Uzbekistan) */
  UzUz: 'uz-UZ',
  /** Welsh (Wales) */
  CyGb: 'cy-GB',
  /** Basque (Spain) */
  EuEs: 'eu-ES',
  /** Galician (Spain) */
  GlEs: 'gl-ES',
} as const;

/** Union of all locale keys */
export type LocaleKey = keyof typeof LOCALE_KEY;
/** Union of all locale enum values */
export type LocaleValue = (typeof LOCALE_KEY)[LocaleKey];

/**
 * List of AWS supported translations, see: https://docs.aws.amazon.com/translate/latest/dg/what-is-languages.html#what-is-languages-supported
 */
export const AWS_SUPPORTED_TRANSLATIONS = {
  Afrikaans: 'af',
  Albanian: 'sq',
  Amharic: 'am',
  Arabic: 'ar',
  Armenian: 'hy',
  Azerbaijani: 'az',
  Bengali: 'bn',
  Bosnian: 'bs',
  Bulgarian: 'bg',
  Catalan: 'ca',
  ChineseSimplified: 'zh',
  ChineseTraditional: 'zh-TW',
  Croatian: 'hr',
  Czech: 'cs',
  Danish: 'da',
  Dari: 'fa-AF',
  Dutch: 'nl',
  English: 'en',
  Estonian: 'et',
  Farsi: 'fa',
  Tagalog: 'tl',
  Finnish: 'fi',
  French: 'fr',
  FrenchCanada: 'fr-CA',
  Georgian: 'ka',
  German: 'de',
  Greek: 'el',
  Gujarati: 'gu',
  HaitianCreole: 'ht',
  Hausa: 'ha',
  Hebrew: 'he',
  Hindi: 'hi',
  Hungarian: 'hu',
  Icelandic: 'is',
  Indonesian: 'id',
  Irish: 'ga',
  Italian: 'it',
  Japanese: 'ja',
  Kannada: 'kn',
  Kazakh: 'kk',
  Korean: 'ko',
  Latvian: 'lv',
  Lithuanian: 'lt',
  Macedonian: 'mk',
  Malay: 'ms',
  Malayalam: 'ml',
  Maltese: 'mt',
  Marathi: 'mr',
  Mongolian: 'mn',
  Norwegian: 'no',
  Pashto: 'ps',
  Polish: 'pl',
  PortugueseBrazil: 'pt',
  PortuguesePortugal: 'pt-PT',
  Punjabi: 'pa',
  Romanian: 'ro',
  Russian: 'ru',
  Serbian: 'sr', // double check if this is latin or cyrillic
  Sinhala: 'si',
  Slovak: 'sk',
  Slovenian: 'sl',
  Somali: 'so',
  Spanish: 'es',
  SpanishMexico: 'es-MX',
  Swahili: 'sw',
  Swedish: 'sv',
  Tamil: 'ta',
  Telugu: 'te',
  Thai: 'th',
  Turkish: 'tr',
  Ukrainian: 'uk',
  Urdu: 'ur',
  Uzbek: 'uz',
  Vietnamese: 'vi',
  Welsh: 'cy',
} as const;

/** Union of all AWS translation keys  */
export type AwsTranslationKey = keyof typeof AWS_SUPPORTED_TRANSLATIONS;
/** Union of all AWS translation enum values */
export type AwsTranslationValue = (typeof AWS_SUPPORTED_TRANSLATIONS)[AwsTranslationKey];

/** Mapping of Locale to AWS Translation */
export const LOCALE_TRANSLATION_MAP: {
  /** AWS translation code keyed by locale value. */
  [k in LocaleValue]: AwsTranslationValue;
} = {
  /* base (2-char) locales */
  [LOCALE_KEY.En]: AWS_SUPPORTED_TRANSLATIONS.English,
  [LOCALE_KEY.Ar]: AWS_SUPPORTED_TRANSLATIONS.Arabic,
  [LOCALE_KEY.Fr]: AWS_SUPPORTED_TRANSLATIONS.French,
  [LOCALE_KEY.Es]: AWS_SUPPORTED_TRANSLATIONS.Spanish,
  [LOCALE_KEY.De]: AWS_SUPPORTED_TRANSLATIONS.German,
  [LOCALE_KEY.It]: AWS_SUPPORTED_TRANSLATIONS.Italian,
  [LOCALE_KEY.Ja]: AWS_SUPPORTED_TRANSLATIONS.Japanese,
  [LOCALE_KEY.Ru]: AWS_SUPPORTED_TRANSLATIONS.Russian,
  [LOCALE_KEY.Af]: AWS_SUPPORTED_TRANSLATIONS.Afrikaans,
  [LOCALE_KEY.Bg]: AWS_SUPPORTED_TRANSLATIONS.Bulgarian,
  [LOCALE_KEY.Zh]: AWS_SUPPORTED_TRANSLATIONS.ChineseSimplified,
  [LOCALE_KEY.Hr]: AWS_SUPPORTED_TRANSLATIONS.Croatian,
  [LOCALE_KEY.Cs]: AWS_SUPPORTED_TRANSLATIONS.Czech,
  [LOCALE_KEY.Da]: AWS_SUPPORTED_TRANSLATIONS.Danish,
  [LOCALE_KEY.Fi]: AWS_SUPPORTED_TRANSLATIONS.Finnish,
  [LOCALE_KEY.El]: AWS_SUPPORTED_TRANSLATIONS.Greek,
  [LOCALE_KEY.Hi]: AWS_SUPPORTED_TRANSLATIONS.Hindi,
  [LOCALE_KEY.Hu]: AWS_SUPPORTED_TRANSLATIONS.Hungarian,
  // TODO: https://linear.app/transcend/issue/GOOM-417/add-id-to-locale-key
  // [LOCALE_KEY.Id]: AWS_SUPPORTED_TRANSLATIONS.Indonesian,
  [LOCALE_KEY.Ko]: AWS_SUPPORTED_TRANSLATIONS.Korean,
  [LOCALE_KEY.Lt]: AWS_SUPPORTED_TRANSLATIONS.Lithuanian,
  [LOCALE_KEY.Ms]: AWS_SUPPORTED_TRANSLATIONS.Malay,
  [LOCALE_KEY.Mr]: AWS_SUPPORTED_TRANSLATIONS.Marathi,
  [LOCALE_KEY.Nb]: AWS_SUPPORTED_TRANSLATIONS.Norwegian,
  [LOCALE_KEY.Pl]: AWS_SUPPORTED_TRANSLATIONS.Polish,
  [LOCALE_KEY.Pt]: AWS_SUPPORTED_TRANSLATIONS.PortuguesePortugal,
  [LOCALE_KEY.Ro]: AWS_SUPPORTED_TRANSLATIONS.Romanian,
  [LOCALE_KEY.Sr]: AWS_SUPPORTED_TRANSLATIONS.Serbian,
  [LOCALE_KEY.Sv]: AWS_SUPPORTED_TRANSLATIONS.Swedish,
  [LOCALE_KEY.Ta]: AWS_SUPPORTED_TRANSLATIONS.Tamil,
  [LOCALE_KEY.Th]: AWS_SUPPORTED_TRANSLATIONS.Thai,
  [LOCALE_KEY.Tr]: AWS_SUPPORTED_TRANSLATIONS.Turkish,
  [LOCALE_KEY.Uk]: AWS_SUPPORTED_TRANSLATIONS.Ukrainian,
  [LOCALE_KEY.Vi]: AWS_SUPPORTED_TRANSLATIONS.Vietnamese,
  [LOCALE_KEY.Zu]: AWS_SUPPORTED_TRANSLATIONS.English, // fallback TODO: https://linear.app/transcend/issue/WAL-5583
  [LOCALE_KEY.He]: AWS_SUPPORTED_TRANSLATIONS.Hebrew,
  [LOCALE_KEY.Nl]: AWS_SUPPORTED_TRANSLATIONS.Dutch,
  [LOCALE_KEY.Et]: AWS_SUPPORTED_TRANSLATIONS.Estonian,
  [LOCALE_KEY.Is]: AWS_SUPPORTED_TRANSLATIONS.Icelandic,
  [LOCALE_KEY.Lv]: AWS_SUPPORTED_TRANSLATIONS.Latvian,
  [LOCALE_KEY.Mt]: AWS_SUPPORTED_TRANSLATIONS.Maltese,
  [LOCALE_KEY.Sk]: AWS_SUPPORTED_TRANSLATIONS.Slovak,
  [LOCALE_KEY.Sl]: AWS_SUPPORTED_TRANSLATIONS.Slovenian,
  [LOCALE_KEY.Fil]: AWS_SUPPORTED_TRANSLATIONS.Tagalog, // NOTE: AWS exposes Tagalog as 'tl' not 'fil'
  [LOCALE_KEY.Bs]: AWS_SUPPORTED_TRANSLATIONS.Bosnian,
  [LOCALE_KEY.Ca]: AWS_SUPPORTED_TRANSLATIONS.Catalan,
  [LOCALE_KEY.Eu]: AWS_SUPPORTED_TRANSLATIONS.English, // TODO: https://linear.app/transcend/issue/WAL-5583 Basque (eu)
  [LOCALE_KEY.Gl]: AWS_SUPPORTED_TRANSLATIONS.English, // TODO: https://linear.app/transcend/issue/WAL-5583 Galician (gl)
  [LOCALE_KEY.Dv]: AWS_SUPPORTED_TRANSLATIONS.English, // TODO: https://linear.app/transcend/issue/WAL-5583 Dhivehi (dv)
  [LOCALE_KEY.Sq]: AWS_SUPPORTED_TRANSLATIONS.Albanian,
  [LOCALE_KEY.Am]: AWS_SUPPORTED_TRANSLATIONS.Amharic,
  [LOCALE_KEY.Hy]: AWS_SUPPORTED_TRANSLATIONS.Armenian,
  [LOCALE_KEY.Az]: AWS_SUPPORTED_TRANSLATIONS.Azerbaijani,
  [LOCALE_KEY.Bn]: AWS_SUPPORTED_TRANSLATIONS.Bengali,
  [LOCALE_KEY.FaAf]: AWS_SUPPORTED_TRANSLATIONS.Dari,
  [LOCALE_KEY.Tl]: AWS_SUPPORTED_TRANSLATIONS.Tagalog,
  [LOCALE_KEY.Ka]: AWS_SUPPORTED_TRANSLATIONS.Georgian,
  [LOCALE_KEY.Gu]: AWS_SUPPORTED_TRANSLATIONS.Gujarati,
  [LOCALE_KEY.Ht]: AWS_SUPPORTED_TRANSLATIONS.HaitianCreole,
  [LOCALE_KEY.Ha]: AWS_SUPPORTED_TRANSLATIONS.Hausa,
  [LOCALE_KEY.Ga]: AWS_SUPPORTED_TRANSLATIONS.Irish,
  [LOCALE_KEY.Kn]: AWS_SUPPORTED_TRANSLATIONS.Kannada,
  [LOCALE_KEY.Kk]: AWS_SUPPORTED_TRANSLATIONS.Kazakh,
  [LOCALE_KEY.Mk]: AWS_SUPPORTED_TRANSLATIONS.Macedonian,
  [LOCALE_KEY.Ml]: AWS_SUPPORTED_TRANSLATIONS.Malayalam,
  [LOCALE_KEY.Mn]: AWS_SUPPORTED_TRANSLATIONS.Mongolian,
  [LOCALE_KEY.Ps]: AWS_SUPPORTED_TRANSLATIONS.Pashto,
  [LOCALE_KEY.Pa]: AWS_SUPPORTED_TRANSLATIONS.Punjabi,
  [LOCALE_KEY.Si]: AWS_SUPPORTED_TRANSLATIONS.Sinhala,
  [LOCALE_KEY.So]: AWS_SUPPORTED_TRANSLATIONS.Somali,
  [LOCALE_KEY.Sw]: AWS_SUPPORTED_TRANSLATIONS.Swahili,
  [LOCALE_KEY.Te]: AWS_SUPPORTED_TRANSLATIONS.Telugu,
  [LOCALE_KEY.Uz]: AWS_SUPPORTED_TRANSLATIONS.Uzbek,
  [LOCALE_KEY.Cy]: AWS_SUPPORTED_TRANSLATIONS.Welsh,

  /* region/script variants */
  [LOCALE_KEY.ArAe]: AWS_SUPPORTED_TRANSLATIONS.Arabic,
  [LOCALE_KEY.FrFr]: AWS_SUPPORTED_TRANSLATIONS.French,
  [LOCALE_KEY.DeDe]: AWS_SUPPORTED_TRANSLATIONS.German,
  [LOCALE_KEY.DeAt]: AWS_SUPPORTED_TRANSLATIONS.German,
  [LOCALE_KEY.DeCh]: AWS_SUPPORTED_TRANSLATIONS.German,
  [LOCALE_KEY.ItIt]: AWS_SUPPORTED_TRANSLATIONS.Italian,
  [LOCALE_KEY.ItCh]: AWS_SUPPORTED_TRANSLATIONS.Italian,
  [LOCALE_KEY.AfZz]: AWS_SUPPORTED_TRANSLATIONS.Afrikaans,
  [LOCALE_KEY.BgBg]: AWS_SUPPORTED_TRANSLATIONS.Bulgarian,
  [LOCALE_KEY.ZhCn]: AWS_SUPPORTED_TRANSLATIONS.ChineseSimplified,
  [LOCALE_KEY.HrHr]: AWS_SUPPORTED_TRANSLATIONS.Croatian,
  [LOCALE_KEY.CsCz]: AWS_SUPPORTED_TRANSLATIONS.Czech,
  [LOCALE_KEY.DaDk]: AWS_SUPPORTED_TRANSLATIONS.Danish,
  [LOCALE_KEY.EnGb]: AWS_SUPPORTED_TRANSLATIONS.English,
  [LOCALE_KEY.EnCa]: AWS_SUPPORTED_TRANSLATIONS.English,
  [LOCALE_KEY.EnAe]: AWS_SUPPORTED_TRANSLATIONS.English,
  [LOCALE_KEY.FiFi]: AWS_SUPPORTED_TRANSLATIONS.Finnish,
  [LOCALE_KEY.ElGr]: AWS_SUPPORTED_TRANSLATIONS.Greek,
  [LOCALE_KEY.HiIn]: AWS_SUPPORTED_TRANSLATIONS.Hindi,
  [LOCALE_KEY.HuHu]: AWS_SUPPORTED_TRANSLATIONS.Hungarian,
  [LOCALE_KEY.IdId]: AWS_SUPPORTED_TRANSLATIONS.Indonesian,
  [LOCALE_KEY.JaJp]: AWS_SUPPORTED_TRANSLATIONS.Japanese,
  [LOCALE_KEY.KoKr]: AWS_SUPPORTED_TRANSLATIONS.Korean,
  [LOCALE_KEY.LtLt]: AWS_SUPPORTED_TRANSLATIONS.Lithuanian,
  [LOCALE_KEY.MsMy]: AWS_SUPPORTED_TRANSLATIONS.Malay,
  [LOCALE_KEY.MrIn]: AWS_SUPPORTED_TRANSLATIONS.Marathi,
  [LOCALE_KEY.NbNi]: AWS_SUPPORTED_TRANSLATIONS.Norwegian,
  [LOCALE_KEY.PlPl]: AWS_SUPPORTED_TRANSLATIONS.Polish,
  [LOCALE_KEY.PtBr]: AWS_SUPPORTED_TRANSLATIONS.PortugueseBrazil,
  [LOCALE_KEY.PtPt]: AWS_SUPPORTED_TRANSLATIONS.PortuguesePortugal,
  [LOCALE_KEY.RoRo]: AWS_SUPPORTED_TRANSLATIONS.Romanian,
  [LOCALE_KEY.RuRu]: AWS_SUPPORTED_TRANSLATIONS.Russian,
  [LOCALE_KEY.SrLatnRs]: AWS_SUPPORTED_TRANSLATIONS.Serbian,
  [LOCALE_KEY.SvSe]: AWS_SUPPORTED_TRANSLATIONS.Swedish,
  [LOCALE_KEY.TaIn]: AWS_SUPPORTED_TRANSLATIONS.Tamil,
  [LOCALE_KEY.ThTh]: AWS_SUPPORTED_TRANSLATIONS.Thai,
  [LOCALE_KEY.TrTr]: AWS_SUPPORTED_TRANSLATIONS.Turkish,
  [LOCALE_KEY.UkUa]: AWS_SUPPORTED_TRANSLATIONS.Ukrainian,
  [LOCALE_KEY.ViVn]: AWS_SUPPORTED_TRANSLATIONS.Vietnamese,
  [LOCALE_KEY.ZuZa]: AWS_SUPPORTED_TRANSLATIONS.English, // TODO: https://linear.app/transcend/issue/WAL-5583
  [LOCALE_KEY.EnUs]: AWS_SUPPORTED_TRANSLATIONS.English,
  [LOCALE_KEY.EnAu]: AWS_SUPPORTED_TRANSLATIONS.English,
  [LOCALE_KEY.FrBe]: AWS_SUPPORTED_TRANSLATIONS.French,
  [LOCALE_KEY.FrCa]: AWS_SUPPORTED_TRANSLATIONS.FrenchCanada,
  [LOCALE_KEY.FrCh]: AWS_SUPPORTED_TRANSLATIONS.French,
  [LOCALE_KEY.EnIe]: AWS_SUPPORTED_TRANSLATIONS.English,
  [LOCALE_KEY.NlNl]: AWS_SUPPORTED_TRANSLATIONS.Dutch,
  [LOCALE_KEY.NlBe]: AWS_SUPPORTED_TRANSLATIONS.Dutch,
  [LOCALE_KEY.EsEs]: AWS_SUPPORTED_TRANSLATIONS.Spanish,
  [LOCALE_KEY.Es419]: AWS_SUPPORTED_TRANSLATIONS.SpanishMexico,
  [LOCALE_KEY.ZhHk]: AWS_SUPPORTED_TRANSLATIONS.ChineseTraditional,
  [LOCALE_KEY.ZhHans]: AWS_SUPPORTED_TRANSLATIONS.ChineseSimplified,
  [LOCALE_KEY.HeIl]: AWS_SUPPORTED_TRANSLATIONS.Hebrew,
  [LOCALE_KEY.EnNz]: AWS_SUPPORTED_TRANSLATIONS.English,
  [LOCALE_KEY.EtEe]: AWS_SUPPORTED_TRANSLATIONS.Estonian,
  [LOCALE_KEY.IsIs]: AWS_SUPPORTED_TRANSLATIONS.Icelandic,
  [LOCALE_KEY.LvLv]: AWS_SUPPORTED_TRANSLATIONS.Latvian,
  [LOCALE_KEY.MtMt]: AWS_SUPPORTED_TRANSLATIONS.Maltese,
  [LOCALE_KEY.SkSk]: AWS_SUPPORTED_TRANSLATIONS.Slovak,
  [LOCALE_KEY.SlSl]: AWS_SUPPORTED_TRANSLATIONS.Slovenian,
  [LOCALE_KEY.ZhTw]: AWS_SUPPORTED_TRANSLATIONS.ChineseTraditional,
  [LOCALE_KEY.MsSg]: AWS_SUPPORTED_TRANSLATIONS.Malay,
  [LOCALE_KEY.SrCyrlRs]: AWS_SUPPORTED_TRANSLATIONS.Serbian, // TODO: AWS uses a single 'sr' (script-agnostic)
  [LOCALE_KEY.EsAr]: AWS_SUPPORTED_TRANSLATIONS.Spanish,
  [LOCALE_KEY.EsCr]: AWS_SUPPORTED_TRANSLATIONS.Spanish,
  [LOCALE_KEY.EsCl]: AWS_SUPPORTED_TRANSLATIONS.Spanish,
  [LOCALE_KEY.EsCo]: AWS_SUPPORTED_TRANSLATIONS.Spanish,
  [LOCALE_KEY.EsMx]: AWS_SUPPORTED_TRANSLATIONS.SpanishMexico,
  [LOCALE_KEY.FilPh]: AWS_SUPPORTED_TRANSLATIONS.Tagalog, // NOTE: AWS uses 'tl' code
  [LOCALE_KEY.SqAl]: AWS_SUPPORTED_TRANSLATIONS.Albanian,
  [LOCALE_KEY.AmEt]: AWS_SUPPORTED_TRANSLATIONS.Amharic,
  [LOCALE_KEY.HyAm]: AWS_SUPPORTED_TRANSLATIONS.Armenian,
  [LOCALE_KEY.AzAz]: AWS_SUPPORTED_TRANSLATIONS.Azerbaijani,
  [LOCALE_KEY.BnBd]: AWS_SUPPORTED_TRANSLATIONS.Bengali,
  [LOCALE_KEY.BnIn]: AWS_SUPPORTED_TRANSLATIONS.Bengali,
  [LOCALE_KEY.BsBa]: AWS_SUPPORTED_TRANSLATIONS.Bosnian,
  [LOCALE_KEY.CaEs]: AWS_SUPPORTED_TRANSLATIONS.Catalan,
  [LOCALE_KEY.TlPh]: AWS_SUPPORTED_TRANSLATIONS.Tagalog,
  [LOCALE_KEY.KaGe]: AWS_SUPPORTED_TRANSLATIONS.Georgian,
  [LOCALE_KEY.GuIn]: AWS_SUPPORTED_TRANSLATIONS.Gujarati,
  [LOCALE_KEY.HtHt]: AWS_SUPPORTED_TRANSLATIONS.HaitianCreole,
  [LOCALE_KEY.GaIe]: AWS_SUPPORTED_TRANSLATIONS.Irish,
  [LOCALE_KEY.KnIn]: AWS_SUPPORTED_TRANSLATIONS.Kannada,
  [LOCALE_KEY.KkKz]: AWS_SUPPORTED_TRANSLATIONS.Kazakh,
  [LOCALE_KEY.MkMk]: AWS_SUPPORTED_TRANSLATIONS.Macedonian,
  [LOCALE_KEY.MlIn]: AWS_SUPPORTED_TRANSLATIONS.Malayalam,
  [LOCALE_KEY.MnMn]: AWS_SUPPORTED_TRANSLATIONS.Mongolian,
  [LOCALE_KEY.PsAf]: AWS_SUPPORTED_TRANSLATIONS.Pashto,
  [LOCALE_KEY.PaIn]: AWS_SUPPORTED_TRANSLATIONS.Punjabi,
  [LOCALE_KEY.PaPk]: AWS_SUPPORTED_TRANSLATIONS.Punjabi, //  TODO: https://linear.app/transcend/issue/WAL-5583
  [LOCALE_KEY.SiLk]: AWS_SUPPORTED_TRANSLATIONS.Sinhala,
  [LOCALE_KEY.SoSo]: AWS_SUPPORTED_TRANSLATIONS.Somali,
  [LOCALE_KEY.SwKe]: AWS_SUPPORTED_TRANSLATIONS.Swahili,
  [LOCALE_KEY.TeIn]: AWS_SUPPORTED_TRANSLATIONS.Telugu,
  [LOCALE_KEY.UzUz]: AWS_SUPPORTED_TRANSLATIONS.Uzbek,
  [LOCALE_KEY.CyGb]: AWS_SUPPORTED_TRANSLATIONS.Welsh,
  [LOCALE_KEY.Ur]: AWS_SUPPORTED_TRANSLATIONS.Urdu,
  [LOCALE_KEY.UrPk]: AWS_SUPPORTED_TRANSLATIONS.Urdu, // AWS has a single Urdu model (no regional split)
  [LOCALE_KEY.UrIn]: AWS_SUPPORTED_TRANSLATIONS.Urdu, // same as above
  [LOCALE_KEY.BsCyrlBa]: AWS_SUPPORTED_TRANSLATIONS.Bosnian, // TODO: AWS uses a single 'bs' (script-agnostic)
  [LOCALE_KEY.BsLatnBa]: AWS_SUPPORTED_TRANSLATIONS.Bosnian, // TODO: AWS uses a single 'bs' (script-agnostic)
  [LOCALE_KEY.EuEs]: AWS_SUPPORTED_TRANSLATIONS.English, // TODO: https://linear.app/transcend/issue/WAL-5583 Basque (eu)
  [LOCALE_KEY.GlEs]: AWS_SUPPORTED_TRANSLATIONS.English, // TODO: https://linear.app/transcend/issue/WAL-5583 Galician (gl)
  [LOCALE_KEY.HaGh]: AWS_SUPPORTED_TRANSLATIONS.Hausa,
  [LOCALE_KEY.HaNe]: AWS_SUPPORTED_TRANSLATIONS.Hausa,
  [LOCALE_KEY.HaNg]: AWS_SUPPORTED_TRANSLATIONS.Hausa,
  [LOCALE_KEY.SoDj]: AWS_SUPPORTED_TRANSLATIONS.Somali,
  [LOCALE_KEY.SoEt]: AWS_SUPPORTED_TRANSLATIONS.Somali,
  [LOCALE_KEY.SoKe]: AWS_SUPPORTED_TRANSLATIONS.Somali,
  [LOCALE_KEY.SwTz]: AWS_SUPPORTED_TRANSLATIONS.Swahili,
  [LOCALE_KEY.SwUg]: AWS_SUPPORTED_TRANSLATIONS.Swahili,
  [LOCALE_KEY.SwCd]: AWS_SUPPORTED_TRANSLATIONS.Swahili,
  [LOCALE_KEY.SqMk]: AWS_SUPPORTED_TRANSLATIONS.Albanian,
  [LOCALE_KEY.SqXk]: AWS_SUPPORTED_TRANSLATIONS.Albanian,
  [LOCALE_KEY.CaAd]: AWS_SUPPORTED_TRANSLATIONS.Catalan,
  [LOCALE_KEY.CaFr]: AWS_SUPPORTED_TRANSLATIONS.Catalan,
  [LOCALE_KEY.CaIt]: AWS_SUPPORTED_TRANSLATIONS.Catalan,
};

function defineLocaleKeyList<const TKeys extends readonly LocaleKey[]>(values: TKeys): TKeys {
  return values;
}

type ConsentManagerUnsupportedLocaleKey =
  | 'Ar'
  | 'Fr'
  | 'Es'
  | 'De'
  | 'It'
  | 'Ja'
  | 'Ru'
  | 'DeAt'
  | 'DeCh'
  | 'ItCh'
  | 'EnGb'
  | 'EnCa'
  | 'EnAe'
  | 'PtPt'
  | 'ZuZa'
  | 'EnUs'
  | 'EnAu'
  | 'FrBe'
  | 'FrCa'
  | 'FrCh'
  | 'EnIe'
  | 'NlBe'
  | 'EnNz'
  | 'EtEe'
  | 'LvLv'
  | 'MtMt'
  | 'SkSk'
  | 'SlSl'
  | 'Af'
  | 'Bg'
  | 'Zh'
  | 'Hr'
  | 'Cs'
  | 'Da'
  | 'Fi'
  | 'El'
  | 'Hi'
  | 'Hu'
  | 'Ko'
  | 'Lt'
  | 'Ms'
  | 'Mr'
  | 'Nb'
  | 'Pl'
  | 'Pt'
  | 'Ro'
  | 'Sr'
  | 'Sv'
  | 'Ta'
  | 'Th'
  | 'Tr'
  | 'Uk'
  | 'Vi'
  | 'Zu'
  | 'Nl'
  | 'Et'
  | 'Is'
  | 'Lv'
  | 'Mt'
  | 'Sk'
  | 'Sl'
  | 'Fil'
  | 'Ca'
  | 'Eu'
  | 'Gl'
  | 'Ur'
  | 'ZhTw'
  | 'MsSg'
  | 'SrCyrlRs'
  | 'EsAr'
  | 'EsCr'
  | 'EsCl'
  | 'EsCo'
  | 'EsMx'
  | 'FilPh'
  | 'Sq'
  | 'Am'
  | 'Hy'
  | 'Az'
  | 'Bn'
  | 'FaAf'
  | 'Tl'
  | 'Ka'
  | 'Gu'
  | 'Ht'
  | 'Ha'
  | 'Ga'
  | 'Kn'
  | 'Kk'
  | 'Mk'
  | 'Ml'
  | 'Mn'
  | 'Ps'
  | 'Pa'
  | 'Si'
  | 'So'
  | 'Sw'
  | 'Te'
  | 'Uz'
  | 'Cy'
  | 'SqAl'
  | 'AmEt'
  | 'HyAm'
  | 'AzAz'
  | 'BnBd'
  | 'BnIn'
  | 'BsBa'
  | 'CaEs'
  | 'TlPh'
  | 'KaGe'
  | 'GuIn'
  | 'HtHt'
  | 'HaNg'
  | 'GaIe'
  | 'KnIn'
  | 'KkKz'
  | 'MkMk'
  | 'MlIn'
  | 'MnMn'
  | 'PsAf'
  | 'PaIn'
  | 'PaPk'
  | 'SiLk'
  | 'SoSo'
  | 'SwKe'
  | 'TeIn'
  | 'UrPk'
  | 'UrIn'
  | 'UzUz'
  | 'CyGb'
  | 'BsCyrlBa'
  | 'BsLatnBa'
  | 'EuEs'
  | 'SqMk'
  | 'SqXk'
  | 'HaGh'
  | 'HaNe'
  | 'SoDj'
  | 'SoEt'
  | 'SoKe'
  | 'SwTz'
  | 'SwUg'
  | 'SwCd'
  | 'CaAd'
  | 'CaFr'
  | 'CaIt'
  | 'GlEs';

/** These are the languages we have an enum value for but do not populate in the CM UI */
const consentManagerUnsupportedLocales: readonly ConsentManagerUnsupportedLocaleKey[] =
  defineLocaleKeyList([
    'Ar',
    'Fr',
    'Es',
    'De',
    'It',
    'Ja',
    'Ru',
    'DeAt',
    'DeCh',
    'ItCh',
    'EnGb',
    'EnCa',
    'EnAe',
    'PtPt',
    'ZuZa',
    'EnUs',
    'EnAu',
    'FrBe',
    'FrCa',
    'FrCh',
    'EnIe',
    'NlBe',
    'EnNz',
    'EtEe',
    'LvLv',
    'MtMt',
    'SkSk',
    'SlSl',
    'Af',
    'Bg',
    'Zh',
    'Hr',
    'Cs',
    'Da',
    'Fi',
    'El',
    'Hi',
    'Hu',
    'Ko',
    'Lt',
    'Ms',
    'Mr',
    'Nb',
    'Pl',
    'Pt',
    'Ro',
    'Sr',
    'Sv',
    'Ta',
    'Th',
    'Tr',
    'Uk',
    'Vi',
    'Zu',
    'Nl',
    'Et',
    'Is',
    'Lv',
    'Mt',
    'Sk',
    'Sl',
    'Fil',
    'Ca',
    'Eu',
    'Gl',
    'Ur',
    'ZhTw',
    'MsSg',
    'SrCyrlRs',
    'EsAr',
    'EsCr',
    'EsCl',
    'EsCo',
    'EsMx',
    'FilPh',
    'Sq',
    'Am',
    'Hy',
    'Az',
    'Bn',
    'FaAf',
    'Tl',
    'Ka',
    'Gu',
    'Ht',
    'Ha',
    'Ga',
    'Kn',
    'Kk',
    'Mk',
    'Ml',
    'Mn',
    'Ps',
    'Pa',
    'Si',
    'So',
    'Sw',
    'Te',
    'Uz',
    'Cy',
    'SqAl',
    'AmEt',
    'HyAm',
    'AzAz',
    'BnBd',
    'BnIn',
    'BsBa',
    'CaEs',
    'TlPh',
    'KaGe',
    'GuIn',
    'HtHt',
    'HaNg',
    'GaIe',
    'KnIn',
    'KkKz',
    'MkMk',
    'MlIn',
    'MnMn',
    'PsAf',
    'PaIn',
    'PaPk',
    'SiLk',
    'SoSo',
    'SwKe',
    'TeIn',
    'UrPk',
    'UrIn',
    'UzUz',
    'CyGb',
    'BsCyrlBa',
    'BsLatnBa',
    'EuEs',
    'SqMk',
    'SqXk',
    'HaGh',
    'HaNe',
    'SoDj',
    'SoEt',
    'SoKe',
    'SwTz',
    'SwUg',
    'SwCd',
    'CaAd',
    'CaFr',
    'CaIt',
    'GlEs',
  ]);

type ConsentManagerUnsupportedLocaleValue = (typeof LOCALE_KEY)[ConsentManagerUnsupportedLocaleKey];

/** Union of Consent Manager unsupported locale keys */
export type ConsentManagerUnsupportedTranslationKey = ConsentManagerUnsupportedLocaleKey;
/** Union of Consent Manager unsupported locale enum values */
export type ConsentManagerUnsupportedTranslationValue = ConsentManagerUnsupportedLocaleValue;

/** Union of Consent Manager supported locale keys */
export type ConsentManagerSupportedTranslationKey = Exclude<
  LocaleKey,
  ConsentManagerUnsupportedLocaleKey
>;
/** Union of Consent Manager supported locale enum values */
export type ConsentManagerSupportedTranslationValue = Exclude<
  LocaleValue,
  ConsentManagerUnsupportedLocaleValue
>;

const consentManagerSupportedLocales = Object.fromEntries(
  Object.entries(LOCALE_KEY).filter(
    ([key]) => !(consentManagerUnsupportedLocales as readonly string[]).includes(key),
  ),
) as Pick<typeof LOCALE_KEY, ConsentManagerSupportedTranslationKey>;

export const CONSENT_MANAGER_SUPPORTED_LOCALES: Pick<
  typeof LOCALE_KEY,
  ConsentManagerSupportedTranslationKey
> = consentManagerSupportedLocales;

/**
 * List of BCP 47 language codes, grabbed from https://www.localeplanet.com/icu/
 *
 * anything commented and marked TO-DO is for languages that AWS supports but we do not
 * all other comments are to leave in those browser codes in case AWS updates to support them
 */
type BrowserLocaleMapKey =
  | 'af'
  | 'af-NA'
  | 'af-ZA'
  | 'am-ET'
  | 'ar'
  | 'ar-001'
  | 'ar-AE'
  | 'ar-BH'
  | 'ar-DJ'
  | 'ar-DZ'
  | 'ar-EG'
  | 'ar-EH'
  | 'ar-ER'
  | 'ar-IL'
  | 'ar-IQ'
  | 'ar-JO'
  | 'ar-KM'
  | 'ar-KW'
  | 'ar-LB'
  | 'ar-LY'
  | 'ar-MA'
  | 'ar-MR'
  | 'ar-OM'
  | 'ar-PS'
  | 'ar-QA'
  | 'ar-SA'
  | 'ar-SD'
  | 'ar-SO'
  | 'ar-SS'
  | 'ar-SY'
  | 'ar-TD'
  | 'ar-TN'
  | 'ar-YE'
  | 'az'
  | 'az-Cyrl'
  | 'az-Cyrl-AZ'
  | 'az-Latn'
  | 'az-Latn-AZ'
  | 'bg'
  | 'bg-BG'
  | 'bn-BD'
  | 'bn-IN'
  | 'bs'
  | 'bs-Cyrl'
  | 'bs-Cyrl-BA'
  | 'bs-Latn'
  | 'bs-Latn-BA'
  | 'ca'
  | 'ca-AD'
  | 'ca-ES'
  | 'ca-FR'
  | 'ca-IT'
  | 'cs'
  | 'cs-CZ'
  | 'cy'
  | 'cy-GB'
  | 'da'
  | 'da-DK'
  | 'da-GL'
  | 'de'
  | 'de-AT'
  | 'de-BE'
  | 'de-CH'
  | 'de-DE'
  | 'de-IT'
  | 'de-LI'
  | 'de-LU'
  | 'el'
  | 'el-CY'
  | 'el-GR'
  | 'en'
  | 'en-001'
  | 'en-150'
  | 'en-AG'
  | 'en-AI'
  | 'en-AS'
  | 'en-AT'
  | 'en-AU'
  | 'en-BB'
  | 'en-BE'
  | 'en-BI'
  | 'en-BM'
  | 'en-BS'
  | 'en-BW'
  | 'en-BZ'
  | 'en-CA'
  | 'en-CC'
  | 'en-CH'
  | 'en-CK'
  | 'en-CM'
  | 'en-CX'
  | 'en-CY'
  | 'en-DE'
  | 'en-DG'
  | 'en-DK'
  | 'en-DM'
  | 'en-ER'
  | 'en-FI'
  | 'en-FJ'
  | 'en-FK'
  | 'en-FM'
  | 'en-GB'
  | 'en-GD'
  | 'en-GG'
  | 'en-GH'
  | 'en-GI'
  | 'en-GM'
  | 'en-GU'
  | 'en-GY'
  | 'en-HK'
  | 'en-IE'
  | 'en-IL'
  | 'en-IM'
  | 'en-IN'
  | 'en-IO'
  | 'en-JE'
  | 'en-JM'
  | 'en-KE'
  | 'en-KI'
  | 'en-KN'
  | 'en-KY'
  | 'en-LC'
  | 'en-LR'
  | 'en-LS'
  | 'en-MG'
  | 'en-MH'
  | 'en-MO'
  | 'en-MP'
  | 'en-MS'
  | 'en-MT'
  | 'en-MU'
  | 'en-MW'
  | 'en-MY'
  | 'en-NA'
  | 'en-NF'
  | 'en-NG'
  | 'en-NL'
  | 'en-NR'
  | 'en-NU'
  | 'en-NZ'
  | 'en-PG'
  | 'en-PH'
  | 'en-PK'
  | 'en-PN'
  | 'en-PR'
  | 'en-PW'
  | 'en-RW'
  | 'en-SB'
  | 'en-SC'
  | 'en-SD'
  | 'en-SE'
  | 'en-SG'
  | 'en-SH'
  | 'en-SI'
  | 'en-SL'
  | 'en-SS'
  | 'en-SX'
  | 'en-SZ'
  | 'en-TC'
  | 'en-TK'
  | 'en-TO'
  | 'en-TT'
  | 'en-TV'
  | 'en-TZ'
  | 'en-UG'
  | 'en-UM'
  | 'en-US'
  | 'en-US-POSIX'
  | 'en-VC'
  | 'en-VG'
  | 'en-VI'
  | 'en-VU'
  | 'en-WS'
  | 'en-ZA'
  | 'en-ZM'
  | 'en-ZW'
  | 'es'
  | 'es-419'
  | 'es-AR'
  | 'es-BO'
  | 'es-BR'
  | 'es-BZ'
  | 'es-CL'
  | 'es-CO'
  | 'es-CR'
  | 'es-CU'
  | 'es-DO'
  | 'es-EA'
  | 'es-EC'
  | 'es-ES'
  | 'es-GQ'
  | 'es-GT'
  | 'es-HN'
  | 'es-IC'
  | 'es-MX'
  | 'es-NI'
  | 'es-PA'
  | 'es-PE'
  | 'es-PH'
  | 'es-PR'
  | 'es-PY'
  | 'es-SV'
  | 'es-US'
  | 'es-UY'
  | 'es-VE'
  | 'et'
  | 'et-EE'
  | 'eu'
  | 'eu-ES'
  | 'fi'
  | 'fi-FI'
  | 'fil'
  | 'fil-PH'
  | 'fr'
  | 'fr-BE'
  | 'fr-BF'
  | 'fr-BI'
  | 'fr-BJ'
  | 'fr-BL'
  | 'fr-CA'
  | 'fr-CD'
  | 'fr-CF'
  | 'fr-CG'
  | 'fr-CH'
  | 'fr-CI'
  | 'fr-CM'
  | 'fr-DJ'
  | 'fr-DZ'
  | 'fr-FR'
  | 'fr-GA'
  | 'fr-GF'
  | 'fr-GN'
  | 'fr-GP'
  | 'fr-GQ'
  | 'fr-HT'
  | 'fr-KM'
  | 'fr-LU'
  | 'fr-MA'
  | 'fr-MC'
  | 'fr-MF'
  | 'fr-MG'
  | 'fr-ML'
  | 'fr-MQ'
  | 'fr-MR'
  | 'fr-MU'
  | 'fr-NC'
  | 'fr-NE'
  | 'fr-PF'
  | 'fr-PM'
  | 'fr-RE'
  | 'fr-RW'
  | 'fr-SC'
  | 'fr-SN'
  | 'fr-SY'
  | 'fr-TD'
  | 'fr-TG'
  | 'fr-TN'
  | 'fr-VU'
  | 'fr-WF'
  | 'fr-YT'
  | 'ga'
  | 'ga-IE'
  | 'gl'
  | 'gl-ES'
  | 'gsw'
  | 'gsw-CH'
  | 'gsw-FR'
  | 'gsw-LI'
  | 'gu'
  | 'gu-IN'
  | 'ha'
  | 'ha-GH'
  | 'ha-NE'
  | 'ha-NG'
  | 'he'
  | 'he-IL'
  | 'hi'
  | 'hi-IN'
  | 'hr'
  | 'hr-BA'
  | 'hr-HR'
  | 'hu'
  | 'hu-HU'
  | 'hy-AM'
  | 'id'
  | 'id-ID'
  | 'is'
  | 'is-IS'
  | 'it'
  | 'it-CH'
  | 'it-IT'
  | 'it-SM'
  | 'it-VA'
  | 'ja'
  | 'ja-JP'
  | 'ka'
  | 'ka-GE'
  | 'kk'
  | 'kk-KZ'
  | 'kn'
  | 'kn-IN'
  | 'ko'
  | 'ko-KP'
  | 'ko-KR'
  | 'lt'
  | 'lt-LT'
  | 'lv'
  | 'lv-LV'
  | 'mk'
  | 'mk-MK'
  | 'ml'
  | 'ml-IN'
  | 'mn'
  | 'mn-MN'
  | 'mr'
  | 'mr-IN'
  | 'ms'
  | 'ms-BN'
  | 'ms-MY'
  | 'ms-SG'
  | 'mt'
  | 'mt-MT'
  | 'nb'
  | 'nb-NO'
  | 'nb-SJ'
  | 'nl'
  | 'nl-AW'
  | 'nl-BE'
  | 'nl-BQ'
  | 'nl-CW'
  | 'nl-NL'
  | 'nl-SR'
  | 'nl-SX'
  | 'pa'
  | 'pa-Arab'
  | 'pa-Arab-PK'
  | 'pa-Guru'
  | 'pa-Guru-IN'
  | 'pl'
  | 'pl-PL'
  | 'ps'
  | 'ps-AF'
  | 'pt'
  | 'pt-AO'
  | 'pt-BR'
  | 'pt-CH'
  | 'pt-CV'
  | 'pt-GQ'
  | 'pt-GW'
  | 'pt-LU'
  | 'pt-MO'
  | 'pt-MZ'
  | 'pt-PT'
  | 'pt-ST'
  | 'pt-TL'
  | 'ro'
  | 'ro-MD'
  | 'ro-RO'
  | 'ru'
  | 'ru-BY'
  | 'ru-KG'
  | 'ru-KZ'
  | 'ru-MD'
  | 'ru-RU'
  | 'ru-UA'
  | 'si'
  | 'si-LK'
  | 'sk'
  | 'sk-SK'
  | 'sl'
  | 'sl-SI'
  | 'so'
  | 'so-DJ'
  | 'so-ET'
  | 'so-KE'
  | 'so-SO'
  | 'sq'
  | 'sq-AL'
  | 'sq-MK'
  | 'sq-XK'
  | 'sr'
  | 'sr-Cyrl'
  | 'sr-Cyrl-BA'
  | 'sr-Cyrl-ME'
  | 'sr-Cyrl-RS'
  | 'sr-Cyrl-XK'
  | 'sr-Latn'
  | 'sr-Latn-BA'
  | 'sr-Latn-ME'
  | 'sr-Latn-RS'
  | 'sr-Latn-XK'
  | 'sv'
  | 'sv-AX'
  | 'sv-FI'
  | 'sv-SE'
  | 'sw'
  | 'sw-CD'
  | 'sw-KE'
  | 'sw-TZ'
  | 'sw-UG'
  | 'ta'
  | 'ta-IN'
  | 'ta-LK'
  | 'ta-MY'
  | 'ta-SG'
  | 'te'
  | 'te-IN'
  | 'th'
  | 'th-TH'
  | 'tr'
  | 'tr-CY'
  | 'tr-TR'
  | 'uk'
  | 'uk-UA'
  | 'ur'
  | 'ur-IN'
  | 'ur-PK'
  | 'uz'
  | 'uz-Arab'
  | 'uz-Arab-AF'
  | 'uz-Cyrl'
  | 'uz-Cyrl-UZ'
  | 'uz-Latn'
  | 'uz-Latn-UZ'
  | 'vi'
  | 'vi-VN'
  | 'yue'
  | 'yue-Hant'
  | 'yue-Hant-HK'
  | 'yue-Hans'
  | 'yue-Hans-CN'
  | 'zh'
  | 'zh-Hans'
  | 'zh-Hans-CN'
  | 'zh-Hans-SG'
  | 'zh-Hans-MO'
  | 'zh-Hans-HK'
  | 'zh-Hant'
  | 'zh-Hant-MO'
  | 'zh-Hant-HK'
  | 'zh-Hant-TW'
  | 'zu'
  | 'zu-ZA';

const localeBrowserMap: Record<BrowserLocaleMapKey, LocaleValue> = {
  af: LOCALE_KEY.AfZz, // Afrikaans Afrikaans
  'af-NA': LOCALE_KEY.AfZz, // Afrikaans (Namibia) Afrikaans (Namibië)
  'af-ZA': LOCALE_KEY.AfZz, // Afrikaans (South Africa) Afrikaans (Suid-Afrika)
  // 'agq', // Aghem Aghem
  // 'agq-CM', // Aghem (Cameroon) Aghem (Kàmàlûŋ)
  // 'ak', // Akan Akan
  // 'ak-GH', // Akan (Ghana) Akan (Gaana)
  // 'am', // Amharic አማርኛ TODO
  'am-ET': LOCALE_KEY.AmEt, // Amharic (Ethiopia) አማርኛ (ኢትዮጵያ)
  ar: LOCALE_KEY.Ar, // Arabic العربية
  'ar-001': LOCALE_KEY.Ar, // Arabic (World) العربية (العالم) Modern Standard Arabic
  'ar-AE': LOCALE_KEY.ArAe, // Arabic (United Arab Emirates) العربية (الإمارات العربية المتحدة)
  'ar-BH': LOCALE_KEY.Ar, // Arabic (Bahrain) العربية (البحرين)
  'ar-DJ': LOCALE_KEY.Ar, // Arabic (Djibouti) العربية (جيبوتي)
  'ar-DZ': LOCALE_KEY.Ar, // Arabic (Algeria) العربية (الجزائر)
  'ar-EG': LOCALE_KEY.Ar, // Arabic (Egypt) العربية (مصر)
  'ar-EH': LOCALE_KEY.Ar, // Arabic (Western Sahara) العربية (الصحراء الغربية)
  'ar-ER': LOCALE_KEY.Ar, // Arabic (Eritrea) العربية (إريتريا)
  'ar-IL': LOCALE_KEY.Ar, // Arabic (Israel) العربية (إسرائيل)
  'ar-IQ': LOCALE_KEY.Ar, // Arabic (Iraq) العربية (العراق)
  'ar-JO': LOCALE_KEY.Ar, // Arabic (Jordan) العربية (الأردن)
  'ar-KM': LOCALE_KEY.Ar, // Arabic (Comoros) العربية (جزر القمر)
  'ar-KW': LOCALE_KEY.Ar, // Arabic (Kuwait) العربية (الكويت)
  'ar-LB': LOCALE_KEY.Ar, // Arabic (Lebanon) العربية (لبنان)
  'ar-LY': LOCALE_KEY.Ar, // Arabic (Libya) العربية (ليبيا)
  'ar-MA': LOCALE_KEY.Ar, // Arabic (Morocco) العربية (المغرب)
  'ar-MR': LOCALE_KEY.Ar, // Arabic (Mauritania) العربية (موريتانيا)
  'ar-OM': LOCALE_KEY.Ar, // Arabic (Oman) العربية (عُمان)
  'ar-PS': LOCALE_KEY.Ar, // Arabic (Palestinian Territories) العربية (الأراضي الفلسطينية)
  'ar-QA': LOCALE_KEY.Ar, // Arabic (Qatar) العربية (قطر)
  'ar-SA': LOCALE_KEY.Ar, // Arabic (Saudi Arabia) العربية (المملكة العربية السعودية)
  'ar-SD': LOCALE_KEY.Ar, // Arabic (Sudan) العربية (السودان)
  'ar-SO': LOCALE_KEY.Ar, // Arabic (Somalia) العربية (الصومال)
  'ar-SS': LOCALE_KEY.Ar, // Arabic (South Sudan) العربية (جنوب السودان)
  'ar-SY': LOCALE_KEY.Ar, // Arabic (Syria) العربية (سوريا)
  'ar-TD': LOCALE_KEY.Ar, // Arabic (Chad) العربية (تشاد)
  'ar-TN': LOCALE_KEY.Ar, // Arabic (Tunisia) العربية (تونس)
  'ar-YE': LOCALE_KEY.Ar, // Arabic (Yemen) العربية (اليمن)
  // 'as', // Assamese অসমীয়া
  // 'as-IN', // Assamese (India) অসমীয়া (ভারত)
  // 'asa', // Asu Kipare
  // 'asa-TZ', // Asu (Tanzania) Kipare (Tadhania)
  // 'ast', // Asturian asturianu
  // 'ast-ES', // Asturian (Spain) asturianu (España)
  az: LOCALE_KEY.Az, // Azerbaijani azərbaycan
  'az-Cyrl': LOCALE_KEY.Az, // Azerbaijani (Cyrillic) азәрбајҹан (Кирил)
  'az-Cyrl-AZ': LOCALE_KEY.Az, // Azerbaijani (Cyrillic, Azerbaijan) азәрбајҹан (Кирил, Азәрбајҹан)
  'az-Latn': LOCALE_KEY.Az, // Azerbaijani (Latin) azərbaycan (latın)
  'az-Latn-AZ': LOCALE_KEY.Az, // Azerbaijani (Latin, Azerbaijan) azərbaycan (latın, Azərbaycan)
  // 'bas', // Basaa Ɓàsàa
  // 'bas-CM', // Basaa (Cameroon) Ɓàsàa (Kàmɛ̀rûn)
  // 'be', // Belarusian беларуская
  // 'be-BY', // Belarusian (Belarus) беларуская (Беларусь)
  // 'bem', // Bemba Ichibemba
  // 'bem-ZM', // Bemba (Zambia) Ichibemba (Zambia)
  // 'bez', // Bena Hibena
  // 'bez-TZ', // Bena (Tanzania) Hibena (Hutanzania)
  bg: LOCALE_KEY.BgBg, // Bulgarian български
  'bg-BG': LOCALE_KEY.BgBg, // Bulgarian (Bulgaria) български (България)
  // 'bm', // Bambara bamanakan
  // 'bm-ML', // Bambara (Mali) bamanakan (Mali)
  // 'bn', // Bangla বাংলা
  'bn-BD': LOCALE_KEY.BnBd, // Bangla (Bangladesh) বাংলা (বাংলাদেশ)
  'bn-IN': LOCALE_KEY.BnIn, // Bangla (India) বাংলা (ভারত)
  // 'bo', // Tibetan བོད་སྐད་
  // 'bo-CN', // Tibetan (China) བོད་སྐད་ (རྒྱ་ནག)
  // 'bo-IN', // Tibetan (India) བོད་སྐད་ (རྒྱ་གར་)
  // 'br', // Breton brezhoneg
  // 'br-FR', // Breton (France) brezhoneg (Frañs)
  // 'brx', // Bodo बड़ो
  // 'brx-IN', // Bodo (India) बड़ो (भारत)
  bs: LOCALE_KEY.BsBa, // Bosnian bosanski
  'bs-Cyrl': LOCALE_KEY.BsCyrlBa, // Bosnian (Cyrillic) босански (ћирилица)
  'bs-Cyrl-BA': LOCALE_KEY.BsCyrlBa, // Bosnian (Cyrillic, Bosnia & Herzegovina) босански (ћирилица, Босна и Херцеговина)
  'bs-Latn': LOCALE_KEY.BsLatnBa, // Bosnian (Latin) bosanski (latinica)
  'bs-Latn-BA': LOCALE_KEY.BsLatnBa, // Bosnian (Latin, Bosnia & Herzegovina) bosanski (latinica, Bosna i Hercegovina)
  ca: LOCALE_KEY.Ca, // Catalan català
  'ca-AD': LOCALE_KEY.CaAd, // Catalan (Andorra) català (Andorra)
  'ca-ES': LOCALE_KEY.CaEs, // Catalan (Spain) català (Espanya)
  'ca-FR': LOCALE_KEY.CaFr, // Catalan (France) català (França)
  'ca-IT': LOCALE_KEY.CaIt, // Catalan (Italy) català (Itàlia)
  // 'ccp', // Chakma 𑄌𑄋𑄴𑄟𑄳𑄦
  // 'ccp-BD', // Chakma (Bangladesh) 𑄌𑄋𑄴𑄟𑄳𑄦 (𑄝𑄁𑄣𑄘𑄬𑄌𑄴)
  // 'ccp-IN', // Chakma (India) 𑄌𑄋𑄴𑄟𑄳𑄦 (𑄞𑄢𑄧𑄖𑄴)
  // 'ce', // Chechen нохчийн
  // 'ce-RU', // Chechen (Russia) нохчийн (Росси)
  // 'cgg', // Chiga Rukiga
  // 'cgg-UG', // Chiga (Uganda) Rukiga (Uganda)
  // 'chr', // Cherokee ᏣᎳᎩ
  // 'chr-US', // Cherokee (United States) ᏣᎳᎩ (ᏌᏊ ᎢᏳᎾᎵᏍᏔᏅ ᏍᎦᏚᎩ)
  // 'ckb', // Central Kurdish کوردیی ناوەندی
  // 'ckb-IQ', // Central Kurdish (Iraq) کوردیی ناوەندی (عێراق)
  // 'ckb-IR', // Central Kurdish (Iran) کوردیی ناوەندی (ئێران)
  cs: LOCALE_KEY.CsCz, // Czech čeština
  'cs-CZ': LOCALE_KEY.CsCz, // Czech (Czechia) čeština (Česko)
  cy: LOCALE_KEY.Cy, // Welsh Cymraeg
  'cy-GB': LOCALE_KEY.CyGb, // Welsh (United Kingdom) Cymraeg (Y Deyrnas Unedig)
  da: LOCALE_KEY.DaDk, // Danish dansk
  'da-DK': LOCALE_KEY.DaDk, // Danish (Denmark) dansk (Danmark)
  'da-GL': LOCALE_KEY.DaDk, // Danish (Greenland) dansk (Grønland)
  // 'dav', // Taita Kitaita
  // 'dav-KE', // Taita (Kenya) Kitaita (Kenya)
  de: LOCALE_KEY.De, // German Deutsch
  'de-AT': LOCALE_KEY.DeAt, // German (Austria) Deutsch (Österreich) Austrian German
  'de-BE': LOCALE_KEY.De, // German (Belgium) Deutsch (Belgien)
  'de-CH': LOCALE_KEY.DeCh, // German (Switzerland) Deutsch (Schweiz) Swiss High German
  'de-DE': LOCALE_KEY.DeDe, // German (Germany) Deutsch (Deutschland)
  'de-IT': LOCALE_KEY.De, // German (Italy) Deutsch (Italien)
  'de-LI': LOCALE_KEY.De, // German (Liechtenstein) Deutsch (Liechtenstein)
  'de-LU': LOCALE_KEY.De, // German (Luxembourg) Deutsch (Luxemburg)
  // 'dje', // Zarma Zarmaciine
  // 'dje-NE', // Zarma (Niger) Zarmaciine (Nižer)
  // 'dsb', // Lower Sorbian dolnoserbšćina
  // 'dsb-DE', // Lower Sorbian (Germany) dolnoserbšćina (Nimska)
  // 'dua', // Duala duálá
  // 'dua-CM', // Duala (Cameroon) duálá (Cameroun)
  // 'dyo', // Jola-Fonyi joola
  // 'dyo-SN', // Jola-Fonyi (Senegal) joola (Senegal)
  // 'dz', // Dzongkha རྫོང་ཁ
  // 'dz-BT', // Dzongkha (Bhutan) རྫོང་ཁ། (འབྲུག།)
  // 'ebu', // Embu Kĩembu
  // 'ebu-KE', // Embu (Kenya) Kĩembu (Kenya)
  // 'ee', // Ewe Eʋegbe
  // 'ee-GH', // Ewe (Ghana) Eʋegbe (Ghana nutome)
  // 'ee-TG', // Ewe (Togo) Eʋegbe (Togo nutome)
  el: LOCALE_KEY.ElGr, // Greek Ελληνικά
  'el-CY': LOCALE_KEY.ElGr, // Greek (Cyprus) Ελληνικά (Κύπρος)
  'el-GR': LOCALE_KEY.ElGr, // Greek (Greece) Ελληνικά (Ελλάδα)
  en: LOCALE_KEY.En, // English English
  'en-001': LOCALE_KEY.En, // English (World) English (World)
  'en-150': LOCALE_KEY.En, // English (Europe) English (Europe)
  'en-AG': LOCALE_KEY.En, // English (Antigua & Barbuda) English (Antigua & Barbuda)
  'en-AI': LOCALE_KEY.En, // English (Anguilla) English (Anguilla)
  'en-AS': LOCALE_KEY.En, // English (American Samoa) English (American Samoa)
  'en-AT': LOCALE_KEY.En, // English (Austria) English (Austria)
  'en-AU': LOCALE_KEY.EnAu, // English (Australia) English (Australia) Australian English
  'en-BB': LOCALE_KEY.En, // English (Barbados) English (Barbados)
  'en-BE': LOCALE_KEY.En, // English (Belgium) English (Belgium)
  'en-BI': LOCALE_KEY.En, // English (Burundi) English (Burundi)
  'en-BM': LOCALE_KEY.En, // English (Bermuda) English (Bermuda)
  'en-BS': LOCALE_KEY.En, // English (Bahamas) English (Bahamas)
  'en-BW': LOCALE_KEY.En, // English (Botswana) English (Botswana)
  'en-BZ': LOCALE_KEY.En, // English (Belize) English (Belize)
  'en-CA': LOCALE_KEY.En, // English (Canada) English (Canada) Canadian English
  'en-CC': LOCALE_KEY.En, // English (Cocos [Keeling] Islands) English (Cocos [Keeling] Islands)
  'en-CH': LOCALE_KEY.En, // English (Switzerland) English (Switzerland)
  'en-CK': LOCALE_KEY.En, // English (Cook Islands) English (Cook Islands)
  'en-CM': LOCALE_KEY.En, // English (Cameroon) English (Cameroon)
  'en-CX': LOCALE_KEY.En, // English (Christmas Island) English (Christmas Island)
  'en-CY': LOCALE_KEY.En, // English (Cyprus) English (Cyprus)
  'en-DE': LOCALE_KEY.En, // English (Germany) English (Germany)
  'en-DG': LOCALE_KEY.En, // English (Diego Garcia) English (Diego Garcia)
  'en-DK': LOCALE_KEY.En, // English (Denmark) English (Denmark)
  'en-DM': LOCALE_KEY.En, // English (Dominica) English (Dominica)
  'en-ER': LOCALE_KEY.En, // English (Eritrea) English (Eritrea)
  'en-FI': LOCALE_KEY.En, // English (Finland) English (Finland)
  'en-FJ': LOCALE_KEY.En, // English (Fiji) English (Fiji)
  'en-FK': LOCALE_KEY.En, // English (Falkland Islands) English (Falkland Islands)
  'en-FM': LOCALE_KEY.En, // English (Micronesia) English (Micronesia)
  'en-GB': LOCALE_KEY.EnGb, // English (United Kingdom) English (United Kingdom) British English
  'en-GD': LOCALE_KEY.En, // English (Grenada) English (Grenada)
  'en-GG': LOCALE_KEY.En, // English (Guernsey) English (Guernsey)
  'en-GH': LOCALE_KEY.En, // English (Ghana) English (Ghana)
  'en-GI': LOCALE_KEY.En, // English (Gibraltar) English (Gibraltar)
  'en-GM': LOCALE_KEY.En, // English (Gambia) English (Gambia)
  'en-GU': LOCALE_KEY.En, // English (Guam) English (Guam)
  'en-GY': LOCALE_KEY.En, // English (Guyana) English (Guyana)
  'en-HK': LOCALE_KEY.En, // English (Hong Kong SAR China) English (Hong Kong SAR China)
  'en-IE': LOCALE_KEY.EnIe, // English (Ireland) English (Ireland)
  'en-IL': LOCALE_KEY.En, // English (Israel) English (Israel)
  'en-IM': LOCALE_KEY.En, // English (Isle of Man) English (Isle of Man)
  'en-IN': LOCALE_KEY.En, // English (India) English (India)
  'en-IO': LOCALE_KEY.En, // English (British Indian Ocean Territory) English (British Indian Ocean Territory)
  'en-JE': LOCALE_KEY.En, // English (Jersey) English (Jersey)
  'en-JM': LOCALE_KEY.En, // English (Jamaica) English (Jamaica)
  'en-KE': LOCALE_KEY.En, // English (Kenya) English (Kenya)
  'en-KI': LOCALE_KEY.En, // English (Kiribati) English (Kiribati)
  'en-KN': LOCALE_KEY.En, // English (St. Kitts & Nevis) English (St. Kitts & Nevis)
  'en-KY': LOCALE_KEY.En, // English (Cayman Islands) English (Cayman Islands)
  'en-LC': LOCALE_KEY.En, // English (St. Lucia) English (St. Lucia)
  'en-LR': LOCALE_KEY.En, // English (Liberia) English (Liberia)
  'en-LS': LOCALE_KEY.En, // English (Lesotho) English (Lesotho)
  'en-MG': LOCALE_KEY.En, // English (Madagascar) English (Madagascar)
  'en-MH': LOCALE_KEY.En, // English (Marshall Islands) English (Marshall Islands)
  'en-MO': LOCALE_KEY.En, // English (Macau SAR China) English (Macau SAR China)
  'en-MP': LOCALE_KEY.En, // English (Northern Mariana Islands) English (Northern Mariana Islands)
  'en-MS': LOCALE_KEY.En, // English (Montserrat) English (Montserrat)
  'en-MT': LOCALE_KEY.En, // English (Malta) English (Malta)
  'en-MU': LOCALE_KEY.En, // English (Mauritius) English (Mauritius)
  'en-MW': LOCALE_KEY.En, // English (Malawi) English (Malawi)
  'en-MY': LOCALE_KEY.En, // English (Malaysia) English (Malaysia)
  'en-NA': LOCALE_KEY.En, // English (Namibia) English (Namibia)
  'en-NF': LOCALE_KEY.En, // English (Norfolk Island) English (Norfolk Island)
  'en-NG': LOCALE_KEY.En, // English (Nigeria) English (Nigeria)
  'en-NL': LOCALE_KEY.En, // English (Netherlands) English (Netherlands)
  'en-NR': LOCALE_KEY.En, // English (Nauru) English (Nauru)
  'en-NU': LOCALE_KEY.En, // English (Niue) English (Niue)
  'en-NZ': LOCALE_KEY.EnNz, // English (New Zealand) English (New Zealand)
  'en-PG': LOCALE_KEY.En, // English (Papua New Guinea) English (Papua New Guinea)
  'en-PH': LOCALE_KEY.En, // English (Philippines) English (Philippines)
  'en-PK': LOCALE_KEY.En, // English (Pakistan) English (Pakistan)
  'en-PN': LOCALE_KEY.En, // English (Pitcairn Islands) English (Pitcairn Islands)
  'en-PR': LOCALE_KEY.En, // English (Puerto Rico) English (Puerto Rico)
  'en-PW': LOCALE_KEY.En, // English (Palau) English (Palau)
  'en-RW': LOCALE_KEY.En, // English (Rwanda) English (Rwanda)
  'en-SB': LOCALE_KEY.En, // English (Solomon Islands) English (Solomon Islands)
  'en-SC': LOCALE_KEY.En, // English (Seychelles) English (Seychelles)
  'en-SD': LOCALE_KEY.En, // English (Sudan) English (Sudan)
  'en-SE': LOCALE_KEY.En, // English (Sweden) English (Sweden)
  'en-SG': LOCALE_KEY.En, // English (Singapore) English (Singapore)
  'en-SH': LOCALE_KEY.En, // English (St. Helena) English (St. Helena)
  'en-SI': LOCALE_KEY.En, // English (Slovenia) English (Slovenia)
  'en-SL': LOCALE_KEY.En, // English (Sierra Leone) English (Sierra Leone)
  'en-SS': LOCALE_KEY.En, // English (South Sudan) English (South Sudan)
  'en-SX': LOCALE_KEY.En, // English (Sint Maarten) English (Sint Maarten)
  'en-SZ': LOCALE_KEY.En, // English (Swaziland) English (Swaziland)
  'en-TC': LOCALE_KEY.En, // English (Turks & Caicos Islands) English (Turks & Caicos Islands)
  'en-TK': LOCALE_KEY.En, // English (Tokelau) English (Tokelau)
  'en-TO': LOCALE_KEY.En, // English (Tonga) English (Tonga)
  'en-TT': LOCALE_KEY.En, // English (Trinidad & Tobago) English (Trinidad & Tobago)
  'en-TV': LOCALE_KEY.En, // English (Tuvalu) English (Tuvalu)
  'en-TZ': LOCALE_KEY.En, // English (Tanzania) English (Tanzania)
  'en-UG': LOCALE_KEY.En, // English (Uganda) English (Uganda)
  'en-UM': LOCALE_KEY.En, // English (U.S. Outlying Islands) English (U.S. Outlying Islands)
  'en-US': LOCALE_KEY.EnUs, // English (United States) English (United States) American English
  'en-US-POSIX': LOCALE_KEY.EnUs, // English (United States, Computer) American English (Computer)
  'en-VC': LOCALE_KEY.En, // English (St. Vincent & Grenadines) English (St. Vincent & Grenadines)
  'en-VG': LOCALE_KEY.En, // English (British Virgin Islands) English (British Virgin Islands)
  'en-VI': LOCALE_KEY.En, // English (U.S. Virgin Islands) English (U.S. Virgin Islands)
  'en-VU': LOCALE_KEY.En, // English (Vanuatu) English (Vanuatu)
  'en-WS': LOCALE_KEY.En, // English (Samoa) English (Samoa)
  'en-ZA': LOCALE_KEY.En, // English (South Africa) English (South Africa)
  'en-ZM': LOCALE_KEY.En, // English (Zambia) English (Zambia)
  'en-ZW': LOCALE_KEY.En, // English (Zimbabwe) English (Zimbabwe)
  // 'eo', // Esperanto esperanto
  es: LOCALE_KEY.Es, // Spanish español
  'es-419': LOCALE_KEY.Es419, // Spanish (Latin America) español (Latinoamérica) Latin American Spanish
  'es-AR': LOCALE_KEY.EsAr, // Spanish (Argentina) español (Argentina)
  'es-BO': LOCALE_KEY.Es419, // Spanish (Bolivia) español (Bolivia)
  'es-BR': LOCALE_KEY.Es419, // Spanish (Brazil) español (Brasil)
  'es-BZ': LOCALE_KEY.Es419, // Spanish (Belize) español (Belice)
  'es-CL': LOCALE_KEY.EsCl, // Spanish (Chile) español (Chile)
  'es-CO': LOCALE_KEY.EsCo, // Spanish (Colombia) español (Colombia)
  'es-CR': LOCALE_KEY.EsCr, // Spanish (Costa Rica) español (Costa Rica)
  'es-CU': LOCALE_KEY.Es419, // Spanish (Cuba) español (Cuba)
  'es-DO': LOCALE_KEY.Es419, // Spanish (Dominican Republic) español (República Dominicana)
  'es-EA': LOCALE_KEY.Es419, // Spanish (Ceuta & Melilla) español (Ceuta y Melilla)
  'es-EC': LOCALE_KEY.Es419, // Spanish (Ecuador) español (Ecuador)
  'es-ES': LOCALE_KEY.EsEs, // Spanish (Spain) español (España) European Spanish
  'es-GQ': LOCALE_KEY.Es419, // Spanish (Equatorial Guinea) español (Guinea Ecuatorial)
  'es-GT': LOCALE_KEY.Es419, // Spanish (Guatemala) español (Guatemala)
  'es-HN': LOCALE_KEY.Es419, // Spanish (Honduras) español (Honduras)
  'es-IC': LOCALE_KEY.Es419, // Spanish (Canary Islands) español (Canarias)
  'es-MX': LOCALE_KEY.EsMx, // Spanish (Mexico) español (México) Mexican Spanish
  'es-NI': LOCALE_KEY.Es419, // Spanish (Nicaragua) español (Nicaragua)
  'es-PA': LOCALE_KEY.Es419, // Spanish (Panama) español (Panamá)
  'es-PE': LOCALE_KEY.Es419, // Spanish (Peru) español (Perú)
  'es-PH': LOCALE_KEY.Es419, // Spanish (Philippines) español (Filipinas)
  'es-PR': LOCALE_KEY.Es419, // Spanish (Puerto Rico) español (Puerto Rico)
  'es-PY': LOCALE_KEY.Es419, // Spanish (Paraguay) español (Paraguay)
  'es-SV': LOCALE_KEY.Es419, // Spanish (El Salvador) español (El Salvador)
  'es-US': LOCALE_KEY.Es419, // Spanish (United States) español (Estados Unidos)
  'es-UY': LOCALE_KEY.Es419, // Spanish (Uruguay) español (Uruguay)
  'es-VE': LOCALE_KEY.Es419, // Spanish (Venezuela) español (Venezuela)
  et: LOCALE_KEY.EtEe, // Estonian eesti
  'et-EE': LOCALE_KEY.EtEe, // Estonian (Estonia) eesti (Eesti)
  eu: LOCALE_KEY.Eu, // Basque euskara
  'eu-ES': LOCALE_KEY.EuEs, // Basque (Spain) euskara (Espainia)
  // 'ewo', // Ewondo ewondo
  // 'ewo-CM', // Ewondo (Cameroon) ewondo (Kamərún)
  // 'fa', // Persian فارسی TODO
  // 'fa-AF', // Persian (Afghanistan) فارسی (افغانستان) Dari TODO
  // 'fa-IR', // Persian (Iran) فارسی (ایران) TODO
  // 'ff', // Fulah Pulaar
  // 'ff-CM', // Fulah (Cameroon) Pulaar (Kameruun)
  // 'ff-GN', // Fulah (Guinea) Pulaar (Gine)
  // 'ff-MR', // Fulah (Mauritania) Pulaar (Muritani)
  // 'ff-SN', // Fulah (Senegal) Pulaar (Senegaal)
  fi: LOCALE_KEY.FiFi, // Finnish suomi
  'fi-FI': LOCALE_KEY.FiFi, // Finnish (Finland) suomi (Suomi)
  fil: LOCALE_KEY.Fil, // Filipino Filipino
  'fil-PH': LOCALE_KEY.FilPh, // Filipino (Philippines) Filipino (Pilipinas)
  // 'fo', // Faroese føroyskt
  // 'fo-DK', // Faroese (Denmark) føroyskt (Danmark)
  // 'fo-FO', // Faroese (Faroe Islands) føroyskt (Føroyar)
  fr: LOCALE_KEY.Fr, // French français
  'fr-BE': LOCALE_KEY.FrBe, // French (Belgium) français (Belgique)
  'fr-BF': LOCALE_KEY.Fr, // French (Burkina Faso) français (Burkina Faso)
  'fr-BI': LOCALE_KEY.Fr, // French (Burundi) français (Burundi)
  'fr-BJ': LOCALE_KEY.Fr, // French (Benin) français (Bénin)
  'fr-BL': LOCALE_KEY.Fr, // French (St. Barthélemy) français (Saint-Barthélemy)
  'fr-CA': LOCALE_KEY.FrCa, // French (Canada) français (Canada) Canadian French
  'fr-CD': LOCALE_KEY.Fr, // French (Congo - Kinshasa) français (Congo-Kinshasa)
  'fr-CF': LOCALE_KEY.Fr, // French (Central African Republic) français (République centrafricaine)
  'fr-CG': LOCALE_KEY.Fr, // French (Congo - Brazzaville) français (Congo-Brazzaville)
  'fr-CH': LOCALE_KEY.FrCh, // French (Switzerland) français (Suisse) Swiss French
  'fr-CI': LOCALE_KEY.Fr, // French (Côte d’Ivoire) français (Côte d’Ivoire)
  'fr-CM': LOCALE_KEY.Fr, // French (Cameroon) français (Cameroun)
  'fr-DJ': LOCALE_KEY.Fr, // French (Djibouti) français (Djibouti)
  'fr-DZ': LOCALE_KEY.Fr, // French (Algeria) français (Algérie)
  'fr-FR': LOCALE_KEY.FrFr, // French (France) français (France)
  'fr-GA': LOCALE_KEY.Fr, // French (Gabon) français (Gabon)
  'fr-GF': LOCALE_KEY.Fr, // French (French Guiana) français (Guyane française)
  'fr-GN': LOCALE_KEY.Fr, // French (Guinea) français (Guinée)
  'fr-GP': LOCALE_KEY.Fr, // French (Guadeloupe) français (Guadeloupe)
  'fr-GQ': LOCALE_KEY.Fr, // French (Equatorial Guinea) français (Guinée équatoriale)
  'fr-HT': LOCALE_KEY.Fr, // French (Haiti) français (Haïti)
  'fr-KM': LOCALE_KEY.Fr, // French (Comoros) français (Comores)
  'fr-LU': LOCALE_KEY.Fr, // French (Luxembourg) français (Luxembourg)
  'fr-MA': LOCALE_KEY.Fr, // French (Morocco) français (Maroc)
  'fr-MC': LOCALE_KEY.Fr, // French (Monaco) français (Monaco)
  'fr-MF': LOCALE_KEY.Fr, // French (St. Martin) français (Saint-Martin)
  'fr-MG': LOCALE_KEY.Fr, // French (Madagascar) français (Madagascar)
  'fr-ML': LOCALE_KEY.Fr, // French (Mali) français (Mali)
  'fr-MQ': LOCALE_KEY.Fr, // French (Martinique) français (Martinique)
  'fr-MR': LOCALE_KEY.Fr, // French (Mauritania) français (Mauritanie)
  'fr-MU': LOCALE_KEY.Fr, // French (Mauritius) français (Maurice)
  'fr-NC': LOCALE_KEY.Fr, // French (New Caledonia) français (Nouvelle-Calédonie)
  'fr-NE': LOCALE_KEY.Fr, // French (Niger) français (Niger)
  'fr-PF': LOCALE_KEY.Fr, // French (French Polynesia) français (Polynésie française)
  'fr-PM': LOCALE_KEY.Fr, // French (St. Pierre & Miquelon) français (Saint-Pierre-et-Miquelon)
  'fr-RE': LOCALE_KEY.Fr, // French (Réunion) français (La Réunion)
  'fr-RW': LOCALE_KEY.Fr, // French (Rwanda) français (Rwanda)
  'fr-SC': LOCALE_KEY.Fr, // French (Seychelles) français (Seychelles)
  'fr-SN': LOCALE_KEY.Fr, // French (Senegal) français (Sénégal)
  'fr-SY': LOCALE_KEY.Fr, // French (Syria) français (Syrie)
  'fr-TD': LOCALE_KEY.Fr, // French (Chad) français (Tchad)
  'fr-TG': LOCALE_KEY.Fr, // French (Togo) français (Togo)
  'fr-TN': LOCALE_KEY.Fr, // French (Tunisia) français (Tunisie)
  'fr-VU': LOCALE_KEY.Fr, // French (Vanuatu) français (Vanuatu)
  'fr-WF': LOCALE_KEY.Fr, // French (Wallis & Futuna) français (Wallis-et-Futuna)
  'fr-YT': LOCALE_KEY.Fr, // French (Mayotte) français (Mayotte)
  // 'fur', // Friulian furlan
  // 'fur-IT', // Friulian (Italy) furlan (Italie)
  // 'fy', // Western Frisian Fryskx
  // 'fy-NL', // Western Frisian (Netherlands) Frysk (Nederlân)
  ga: LOCALE_KEY.Ga, // Irish Gaeilge
  'ga-IE': LOCALE_KEY.GaIe, // Irish (Ireland) Gaeilge (Éire)
  // 'gd', // Scottish Gaelic Gàidhlig
  // 'gd-GB', // Scottish Gaelic (United Kingdom) Gàidhlig (An Rìoghachd Aonaichte)
  gl: LOCALE_KEY.Gl, // Galician galego
  'gl-ES': LOCALE_KEY.GlEs, // Galician (Spain) galego (España)
  gsw: LOCALE_KEY.DeCh, // Swiss German Schwiizertüütsch
  'gsw-CH': LOCALE_KEY.DeCh, // Swiss German (Switzerland) Schwiizertüütsch (Schwiiz)
  'gsw-FR': LOCALE_KEY.DeCh, // Swiss German (France) Schwiizertüütsch (Frankriich)
  'gsw-LI': LOCALE_KEY.DeCh, // Swiss German (Liechtenstein) Schwiizertüütsch (Liächteschtäi)
  gu: LOCALE_KEY.Gu, // Gujarati ગુજરાતી
  'gu-IN': LOCALE_KEY.GuIn, // Gujarati (India) ગુજરાતી (ભારત)
  // 'guz', // Gusii Ekegusii
  // 'guz-KE', // Gusii (Kenya) Ekegusii (Kenya)
  // 'gv', // Manx Gaelg
  // 'gv-IM', // Manx (Isle of Man) Gaelg (Ellan Vannin)
  ha: LOCALE_KEY.Ha, // Hausa Hausa
  'ha-GH': LOCALE_KEY.HaGh, // Hausa (Ghana) Hausa (Gana)
  'ha-NE': LOCALE_KEY.HaNe, // Hausa (Niger) Hausa (Nijar)
  'ha-NG': LOCALE_KEY.HaNg, // Hausa (Nigeria) Hausa (Najeriya)
  // 'haw', // Hawaiian ʻŌlelo Hawaiʻi
  // 'haw-US', // Hawaiian (United States) ʻŌlelo Hawaiʻi (ʻAmelika Hui Pū ʻIa)
  he: LOCALE_KEY.HeIl, // Hebrew עברית
  'he-IL': LOCALE_KEY.HeIl, // Hebrew (Israel) עברית (ישראל)
  hi: LOCALE_KEY.HiIn, // Hindi हिन्दी
  'hi-IN': LOCALE_KEY.HiIn, // Hindi (India) हिन्दी (भारत)
  hr: LOCALE_KEY.HrHr, // Croatian hrvatski
  'hr-BA': LOCALE_KEY.HrHr, // Croatian (Bosnia & Herzegovina) hrvatski (Bosna i Hercegovina)
  'hr-HR': LOCALE_KEY.HrHr, // Croatian (Croatia) hrvatski (Hrvatska)
  // 'hsb', // Upper Sorbian hornjoserbšćina
  // 'hsb-DE', // Upper Sorbian (Germany) hornjoserbšćina (Němska)
  hu: LOCALE_KEY.HuHu, // Hungarian magyar
  'hu-HU': LOCALE_KEY.HuHu, // Hungarian (Hungary) magyar (Magyarország)
  // 'hy', // Armenian հայերեն TODO
  'hy-AM': LOCALE_KEY.HyAm, // Armenian (Armenia) հայերեն (Հայաստան)
  id: LOCALE_KEY.IdId, // Indonesian Indonesia
  'id-ID': LOCALE_KEY.IdId, // Indonesian (Indonesia) Indonesia (Indonesia)
  // 'ig', // Igbo Igbo
  // 'ig-NG', // Igbo (Nigeria) Igbo (Naịjịrịa)
  // 'ii', // Sichuan Yi ꆈꌠꉙ
  // 'ii-CN', // Sichuan Yi (China) ꆈꌠꉙ (ꍏꇩ)
  is: LOCALE_KEY.IsIs, // Icelandic íslenska
  'is-IS': LOCALE_KEY.IsIs, // Icelandic (Iceland) íslenska (Ísland)
  it: LOCALE_KEY.It, // Italian italiano
  'it-CH': LOCALE_KEY.ItCh, // Italian (Switzerland) italiano (Svizzera)
  'it-IT': LOCALE_KEY.ItIt, // Italian (Italy) italiano (Italia)
  'it-SM': LOCALE_KEY.ItIt, // Italian (San Marino) italiano (San Marino)
  'it-VA': LOCALE_KEY.ItIt, // Italian (Vatican City) italiano (Città del Vaticano)
  ja: LOCALE_KEY.Ja, // Japanese 日本語
  'ja-JP': LOCALE_KEY.JaJp, // Japanese (Japan) 日本語 (日本)
  // 'jgo', // Ngomba Ndaꞌa
  // 'jgo-CM', // Ngomba (Cameroon) Ndaꞌa (Kamɛlûn)
  // 'jmc', // Machame Kimachame
  // 'jmc-TZ', // Machame (Tanzania) Kimachame (Tanzania)
  ka: LOCALE_KEY.Ka, // Georgian ქართული
  'ka-GE': LOCALE_KEY.KaGe, // Georgian (Georgia) ქართული (საქართველო)
  // 'kab', // Kabyle Taqbaylit
  // 'kab-DZ', // Kabyle (Algeria) Taqbaylit (Lezzayer)
  // 'kam', // Kamba Kikamba
  // 'kam-KE', // Kamba (Kenya) Kikamba (Kenya)
  // 'kde', // Makonde Chimakonde
  // 'kde-TZ', // Makonde (Tanzania) Chimakonde (Tanzania)
  // 'kea', // Kabuverdianu kabuverdianu
  // 'kea-CV', // Kabuverdianu (Cape Verde) kabuverdianu (Kabu Verdi)
  // 'khq', // Koyra Chiini Koyra ciini
  // 'khq-ML', // Koyra Chiini (Mali) Koyra ciini (Maali)
  // 'ki', // Kikuyu Gikuyu
  // 'ki-KE', // Kikuyu (Kenya) Gikuyu (Kenya)
  kk: LOCALE_KEY.Kk, // Kazakh қазақ тілі
  'kk-KZ': LOCALE_KEY.KkKz, // Kazakh (Kazakhstan) қазақ тілі (Қазақстан)
  // 'kkj', // Kako kakɔ
  // 'kkj-CM', // Kako (Cameroon) kakɔ (Kamɛrun)
  // 'kl', // Kalaallisut kalaallisut
  // 'kl-GL', // Kalaallisut (Greenland) kalaallisut (Kalaallit Nunaat)
  // 'kln', // Kalenjin Kalenjin
  // 'kln-KE', // Kalenjin (Kenya) Kalenjin (Emetab Kenya)
  // 'km', // Khmer ខ្មែរ
  // 'km-KH', // Khmer (Cambodia) ខ្មែរ (កម្ពុជា)
  kn: LOCALE_KEY.Kn, // Kannada ಕನ್ನಡ
  'kn-IN': LOCALE_KEY.KnIn, // Kannada (India) ಕನ್ನಡ (ಭಾರತ)
  ko: LOCALE_KEY.KoKr, // Korean 한국어
  'ko-KP': LOCALE_KEY.KoKr, // Korean (North Korea) 한국어(조선민주주의인민공화국)
  'ko-KR': LOCALE_KEY.KoKr, // Korean (South Korea) 한국어(대한민국)
  // 'kok', // Konkani कोंकणी
  // 'kok-IN', // Konkani (India) कोंकणी (भारत)
  // 'ks', // Kashmiri کٲشُر
  // 'ks-IN', // Kashmiri (India) کٲشُر (ہِنٛدوستان)
  // 'ksb', // Shambala Kishambaa
  // 'ksb-TZ', // Shambala (Tanzania) Kishambaa (Tanzania)
  // 'ksf', // Bafia rikpa
  // 'ksf-CM', // Bafia (Cameroon) rikpa (kamɛrún)
  // 'ksh', // Colognian Kölsch
  // 'ksh-DE', // Colognian (Germany) Kölsch en Doütschland
  // 'kw', // Cornish kernewek
  // 'kw-GB', // Cornish (United Kingdom) kernewek (Rywvaneth Unys)
  // 'ky', // Kyrgyz кыргызча
  // 'ky-KG', // Kyrgyz (Kyrgyzstan) кыргызча (Кыргызстан)
  // 'lag', // Langi Kɨlaangi
  // 'lag-TZ', // Langi (Tanzania) Kɨlaangi (Taansanía)
  // 'lb', // Luxembourgish Lëtzebuergesch
  // 'lb-LU', // Luxembourgish (Luxembourg) Lëtzebuergesch (Lëtzebuerg)
  // 'lg', // Ganda Luganda
  // 'lg-UG', // Ganda (Uganda) Luganda (Yuganda)
  // 'lkt', // Lakota Lakȟólʼiyapi
  // 'lkt-US', // Lakota (United States) Lakȟólʼiyapi (Mílahaŋska Tȟamákȟočhe)
  // 'ln', // Lingala lingála
  // 'ln-AO', // Lingala (Angola) lingála (Angóla)
  // 'ln-CD', // Lingala (Congo - Kinshasa) lingála (Republíki ya Kongó Demokratíki)
  // 'ln-CF', // Lingala (Central African Republic) lingála (Repibiki ya Afríka ya Káti)
  // 'ln-CG', // Lingala (Congo - Brazzaville) lingála (Kongo)
  // 'lo', // Lao ລາວ
  // 'lo-LA', // Lao (Laos) ລາວ (ລາວ)
  // 'lrc', // Northern Luri لۊری شومالی
  // 'lrc-IQ', // Northern Luri (Iraq) لۊری شومالی (IQ)
  // 'lrc-IR', // Northern Luri (Iran) لۊری شومالی (IR)
  lt: LOCALE_KEY.LtLt, // Lithuanian lietuvių
  'lt-LT': LOCALE_KEY.LtLt, // Lithuanian (Lithuania) lietuvių (Lietuva)
  // 'lu', // Luba-Katanga Tshiluba
  // 'lu-CD', // Luba-Katanga (Congo - Kinshasa) Tshiluba (Ditunga wa Kongu)
  // 'luo', // Luo Dholuo
  // 'luo-KE', // Luo (Kenya) Dholuo (Kenya)
  // 'luy', // Luyia Luluhia
  // 'luy-KE', // Luyia (Kenya) Luluhia (Kenya)
  lv: LOCALE_KEY.LvLv, // Latvian latviešu
  'lv-LV': LOCALE_KEY.LvLv, // Latvian (Latvia) latviešu (Latvija)
  // 'mas', // Masai Maa
  // 'mas-KE', // Masai (Kenya) Maa (Kenya)
  // 'mas-TZ', // Masai (Tanzania) Maa (Tansania)
  // 'mer', // Meru Kĩmĩrũ
  // 'mer-KE', // Meru (Kenya) Kĩmĩrũ (Kenya)
  // 'mfe', // Morisyen kreol morisien
  // 'mfe-MU', // Morisyen (Mauritius) kreol morisien (Moris)
  // 'mg', // Malagasy Malagasy
  // 'mg-MG', // Malagasy (Madagascar) Malagasy (Madagasikara)
  // 'mgh', // Makhuwa-Meetto Makua
  // 'mgh-MZ', // Makhuwa-Meetto (Mozambique) Makua (Umozambiki)
  // 'mgo', // Metaʼ metaʼ
  // 'mgo-CM', // Metaʼ (Cameroon) metaʼ (Kamalun)
  mk: LOCALE_KEY.Mk, // Macedonian македонски
  'mk-MK': LOCALE_KEY.MkMk, // Macedonian (Macedonia) македонски (Македонија)
  ml: LOCALE_KEY.Ml, // Malayalam മലയാളം
  'ml-IN': LOCALE_KEY.MlIn, // Malayalam (India) മലയാളം (ഇന്ത്യ)
  mn: LOCALE_KEY.Mn, // Mongolian монгол
  'mn-MN': LOCALE_KEY.MnMn, // Mongolian (Mongolia) монгол (Монгол)
  mr: LOCALE_KEY.MrIn, // Marathi मराठी
  'mr-IN': LOCALE_KEY.MrIn, // Marathi (India) मराठी (भारत)
  ms: LOCALE_KEY.MsMy, // Malay Melayu
  'ms-BN': LOCALE_KEY.MsMy, // Malay (Brunei) Melayu (Brunei)
  'ms-MY': LOCALE_KEY.MsMy, // Malay (Malaysia) Melayu (Malaysia)
  'ms-SG': LOCALE_KEY.MsMy, // Malay (Singapore) Melayu (Singapura)
  mt: LOCALE_KEY.MtMt, // Maltese Malti
  'mt-MT': LOCALE_KEY.MtMt, // Maltese (Malta) Malti (Malta)
  // 'mua', // Mundang MUNDAŊ
  // 'mua-CM', // Mundang (Cameroon) MUNDAŊ (kameruŋ)
  // 'my', // Burmese မြန်မာ
  // 'my-MM', // Burmese (Myanmar [Burma]) မြန်မာ (မြန်မာ)
  // 'mzn', // Mazanderani مازرونی
  // 'mzn-IR', // Mazanderani (Iran) مازرونی (ایران)
  // 'naq', // Nama Khoekhoegowab
  // 'naq-NA', // Nama (Namibia) Khoekhoegowab (Namibiab)
  nb: LOCALE_KEY.NbNi, // Norwegian Bokmål norsk bokmål
  'nb-NO': LOCALE_KEY.NbNi, // Norwegian Bokmål (Norway) norsk bokmål (Norge)
  'nb-SJ': LOCALE_KEY.NbNi, // Norwegian Bokmål (Svalbard & Jan Mayen) norsk bokmål (Svalbard og Jan Mayen)
  // 'nd', // North Ndebele isiNdebele
  // 'nd-ZW', // North Ndebele (Zimbabwe) isiNdebele (Zimbabwe)
  // 'nds', // Low German nds TODO?
  // 'nds-DE', // Low German (Germany) nds (DE) TODO?
  // 'nds-NL', // Low German (Netherlands) nds (NL) Low Saxon TODO?
  // 'ne', // Nepali नेपाली
  // 'ne-IN', // Nepali (India) नेपाली (भारत)
  // 'ne-NP', // Nepali (Nepal) नेपाली (नेपाल)
  nl: LOCALE_KEY.NlNl, // Dutch Nederlands
  'nl-AW': LOCALE_KEY.NlNl, // Dutch (Aruba) Nederlands (Aruba)
  'nl-BE': LOCALE_KEY.NlBe, // Dutch (Belgium) Nederlands (België) Flemish
  'nl-BQ': LOCALE_KEY.NlNl, // Dutch (Caribbean Netherlands) Nederlands (Caribisch Nederland)
  'nl-CW': LOCALE_KEY.NlNl, // Dutch (Curaçao) Nederlands (Curaçao)
  'nl-NL': LOCALE_KEY.NlNl, // Dutch (Netherlands) Nederlands (Nederland)
  'nl-SR': LOCALE_KEY.NlNl, // Dutch (Suriname) Nederlands (Suriname)
  'nl-SX': LOCALE_KEY.NlNl, // Dutch (Sint Maarten) Nederlands (Sint-Maarten)
  // 'nmg', // Kwasio nmg
  // 'nmg-CM', // Kwasio (Cameroon) nmg (Kamerun)
  // 'nn', // Norwegian Nynorsk nynorsk
  // 'nn-NO', // Norwegian Nynorsk (Norway) nynorsk (Noreg)
  // 'nnh', // Ngiemboon Shwóŋò ngiembɔɔn
  // 'nnh-CM', // Ngiemboon (Cameroon) Shwóŋò ngiembɔɔn (Kàmalûm)
  // 'nus', // Nuer Thok Nath
  // 'nus-SS', // Nuer (South Sudan) Thok Nath (SS)
  // 'nyn', // Nyankole Runyankore
  // 'nyn-UG', // Nyankole (Uganda) Runyankore (Uganda)
  // 'om', // Oromo Oromoo
  // 'om-ET', // Oromo (Ethiopia) Oromoo (Itoophiyaa)
  // 'om-KE', // Oromo (Kenya) Oromoo (Keeniyaa)
  // 'or', // Odia ଓଡ଼ିଆ
  // 'or-IN', // Odia (India) ଓଡ଼ିଆ (ଭାରତ)
  // 'os', // Ossetic ирон
  // 'os-GE', // Ossetic (Georgia) ирон (Гуырдзыстон)
  // 'os-RU', // Ossetic (Russia) ирон (Уӕрӕсе)
  pa: LOCALE_KEY.Pa, // Punjabi ਪੰਜਾਬੀ
  'pa-Arab': LOCALE_KEY.PaPk, // Punjabi (Arabic) پنجابی (عربی)
  'pa-Arab-PK': LOCALE_KEY.PaPk, // Punjabi (Arabic, Pakistan) پنجابی (عربی, پاکستان)
  'pa-Guru': LOCALE_KEY.PaIn, // Punjabi (Gurmukhi) ਪੰਜਾਬੀ (ਗੁਰਮੁਖੀ)
  'pa-Guru-IN': LOCALE_KEY.PaIn, // Punjabi (Gurmukhi, India) ਪੰਜਾਬੀ (ਗੁਰਮੁਖੀ, ਭਾਰਤ)
  pl: LOCALE_KEY.PlPl, // Polish polski
  'pl-PL': LOCALE_KEY.PlPl, // Polish (Poland) polski (Polska)
  ps: LOCALE_KEY.Ps, // Pashto پښتو
  'ps-AF': LOCALE_KEY.PsAf, // Pashto (Afghanistan) پښتو (افغانستان)
  pt: LOCALE_KEY.PtPt, // Portuguese português
  'pt-AO': LOCALE_KEY.PtPt, // Portuguese (Angola) português (Angola)
  'pt-BR': LOCALE_KEY.PtBr, // Portuguese (Brazil) português (Brasil) Brazilian Portuguese
  'pt-CH': LOCALE_KEY.PtPt, // Portuguese (Switzerland) português (Suíça)
  'pt-CV': LOCALE_KEY.PtPt, // Portuguese (Cape Verde) português (Cabo Verde)
  'pt-GQ': LOCALE_KEY.PtPt, // Portuguese (Equatorial Guinea) português (Guiné Equatorial)
  'pt-GW': LOCALE_KEY.PtPt, // Portuguese (Guinea-Bissau) português (Guiné-Bissau)
  'pt-LU': LOCALE_KEY.PtPt, // Portuguese (Luxembourg) português (Luxemburgo)
  'pt-MO': LOCALE_KEY.PtPt, // Portuguese (Macau SAR China) português (Macau, RAE da China)
  'pt-MZ': LOCALE_KEY.PtPt, // Portuguese (Mozambique) português (Moçambique)
  'pt-PT': LOCALE_KEY.PtPt, // Portuguese (Portugal) português (Portugal) European Portuguese
  'pt-ST': LOCALE_KEY.PtPt, // Portuguese (São Tomé & Príncipe) português (São Tomé e Príncipe)
  'pt-TL': LOCALE_KEY.PtPt, // Portuguese (Timor-Leste) português (Timor-Leste)
  // 'qu', // Quechua Runasimi
  // 'qu-BO', // Quechua (Bolivia) Runasimi (Bolivia)
  // 'qu-EC', // Quechua (Ecuador) Runasimi (Ecuador)
  // 'qu-PE', // Quechua (Peru) Runasimi (Perú)
  // 'rm', // Romansh rumantsch
  // 'rm-CH', // Romansh (Switzerland) rumantsch (Svizra)
  // 'rn', // Rundi Ikirundi
  // 'rn-BI', // Rundi (Burundi) Ikirundi (Uburundi)
  ro: LOCALE_KEY.RoRo, // Romanian română
  'ro-MD': LOCALE_KEY.RoRo, // Romanian (Moldova) română (Republica Moldova) Moldavian
  'ro-RO': LOCALE_KEY.RoRo, // Romanian (Romania) română (România)
  // 'rof', // Rombo Kihorombo
  // 'rof-TZ', // Rombo (Tanzania) Kihorombo (Tanzania)
  ru: LOCALE_KEY.Ru, // Russian русский
  'ru-BY': LOCALE_KEY.Ru, // Russian (Belarus) русский (Беларусь)
  'ru-KG': LOCALE_KEY.Ru, // Russian (Kyrgyzstan) русский (Киргизия)
  'ru-KZ': LOCALE_KEY.Ru, // Russian (Kazakhstan) русский (Казахстан)
  'ru-MD': LOCALE_KEY.Ru, // Russian (Moldova) русский (Молдова)
  'ru-RU': LOCALE_KEY.RuRu, // Russian (Russia) русский (Россия)
  'ru-UA': LOCALE_KEY.Ru, // Russian (Ukraine) русский (Украина)
  // 'rw', // Kinyarwanda Kinyarwanda
  // 'rw-RW', // Kinyarwanda (Rwanda) Kinyarwanda (U Rwanda)
  // 'rwk', // Rwa Kiruwa
  // 'rwk-TZ', // Rwa (Tanzania) Kiruwa (Tanzania)
  // 'sah', // Sakha саха тыла
  // 'sah-RU', // Sakha (Russia) саха тыла (Арассыыйа)
  // 'saq', // Samburu Kisampur
  // 'saq-KE', // Samburu (Kenya) Kisampur (Kenya)
  // 'sbp', // Sangu Ishisangu
  // 'sbp-TZ', // Sangu (Tanzania) Ishisangu (Tansaniya)
  // 'se', // Northern Sami davvisámegiella
  // 'se-FI', // Northern Sami (Finland) davvisámegiella (Suopma)
  // 'se-NO', // Northern Sami (Norway) davvisámegiella (Norga)
  // 'se-SE', // Northern Sami (Sweden) davvisámegiella (Ruoŧŧa)
  // 'seh', // Sena sena
  // 'seh-MZ', // Sena (Mozambique) sena (Moçambique)
  // 'ses', // Koyraboro Senni Koyraboro senni
  // 'ses-ML', // Koyraboro Senni (Mali) Koyraboro senni (Maali)
  // 'sg', // Sango Sängö
  // 'sg-CF', // Sango (Central African Republic) Sängö (Ködörösêse tî Bêafrîka)
  // 'shi', // Tachelhit ⵜⴰⵛⵍⵃⵉⵜ
  // 'shi-Latn', // Tachelhit (Latin) Tashelḥiyt (Latn)
  // 'shi-Latn-MA', // Tachelhit (Latin, Morocco) Tashelḥiyt (Latn, lmɣrib)
  // 'shi-Tfng', // Tachelhit (Tifinagh) ⵜⴰⵛⵍⵃⵉⵜ (Tfng)
  // 'shi-Tfng-MA', // Tachelhit (Tifinagh, Morocco) ⵜⴰⵛⵍⵃⵉⵜ (Tfng, ⵍⵎⵖⵔⵉⴱ)
  si: LOCALE_KEY.Si, // Sinhala සිංහල
  'si-LK': LOCALE_KEY.SiLk, // Sinhala (Sri Lanka) සිංහල (ශ්‍රී ලංකාව)
  sk: LOCALE_KEY.SkSk, // Slovak slovenčina
  'sk-SK': LOCALE_KEY.SkSk, // Slovak (Slovakia) slovenčina (Slovensko)
  sl: LOCALE_KEY.SlSl, // Slovenian slovenščina
  'sl-SI': LOCALE_KEY.SlSl, // Slovenian (Slovenia) slovenščina (Slovenija)
  // 'smn', // Inari Sami anarâškielâ
  // 'smn-FI', // Inari Sami (Finland) anarâškielâ (Suomâ)
  // 'sn', // Shona chiShona
  // 'sn-ZW', // Shona (Zimbabwe) chiShona (Zimbabwe)
  so: LOCALE_KEY.So, // Somali Soomaali
  'so-DJ': LOCALE_KEY.SoDj, // Somali (Djibouti) Soomaali (Jabuuti)
  'so-ET': LOCALE_KEY.SoEt, // Somali (Ethiopia) Soomaali (Itoobiya)
  'so-KE': LOCALE_KEY.SoKe, // Somali (Kenya) Soomaali (Kiiniya)
  'so-SO': LOCALE_KEY.SoSo, // Somali (Somalia) Soomaali (Soomaaliya)
  sq: LOCALE_KEY.Sq, // Albanian shqip
  'sq-AL': LOCALE_KEY.SqAl, // Albanian (Albania) shqip (Shqipëri)
  'sq-MK': LOCALE_KEY.SqMk, // Albanian (Macedonia) shqip (Maqedoni)
  'sq-XK': LOCALE_KEY.SqXk, // Albanian (Kosovo) shqip (Kosovë)
  sr: LOCALE_KEY.SrLatnRs, // Serbian српски
  'sr-Cyrl': LOCALE_KEY.SrCyrlRs, // Serbian (Cyrillic) српски (ћирилица)
  'sr-Cyrl-BA': LOCALE_KEY.SrCyrlRs, // Serbian (Cyrillic, Bosnia & Herzegovina) српски (ћирилица, Босна и Херцеговина)
  'sr-Cyrl-ME': LOCALE_KEY.SrCyrlRs, // Serbian (Cyrillic, Montenegro) српски (ћирилица, Црна Гора)
  'sr-Cyrl-RS': LOCALE_KEY.SrCyrlRs, // Serbian (Cyrillic, Serbia) српски (ћирилица, Србија)
  'sr-Cyrl-XK': LOCALE_KEY.SrCyrlRs, // Serbian (Cyrillic, Kosovo) српски (ћирилица, Косово)
  'sr-Latn': LOCALE_KEY.SrLatnRs, // Serbian (Latin) srpski (latinica)
  'sr-Latn-BA': LOCALE_KEY.SrLatnRs, // Serbian (Latin, Bosnia & Herzegovina) srpski (latinica, Bosna i Hercegovina)
  'sr-Latn-ME': LOCALE_KEY.SrLatnRs, // Serbian (Latin, Montenegro) srpski (latinica, Crna Gora)
  'sr-Latn-RS': LOCALE_KEY.SrLatnRs, // Serbian (Latin, Serbia) srpski (latinica, Srbija)
  'sr-Latn-XK': LOCALE_KEY.SrLatnRs, // Serbian (Latin, Kosovo) srpski (latinica, Kosovo)
  sv: LOCALE_KEY.SvSe, // Swedish svenska
  'sv-AX': LOCALE_KEY.SvSe, // Swedish (Åland Islands) svenska (Åland)
  'sv-FI': LOCALE_KEY.SvSe, // Swedish (Finland) svenska (Finland)
  'sv-SE': LOCALE_KEY.SvSe, // Swedish (Sweden) svenska (Sverige)
  sw: LOCALE_KEY.Sw, // Swahili Kiswahili
  'sw-CD': LOCALE_KEY.SwCd, // Swahili (Congo - Kinshasa) Kiswahili (Jamhuri ya Kidemokrasia ya Kongo) Congo Swahili
  'sw-KE': LOCALE_KEY.SwKe, // Swahili (Kenya) Kiswahili (Kenya)
  'sw-TZ': LOCALE_KEY.SwTz, // Swahili (Tanzania) Kiswahili (Tanzania)
  'sw-UG': LOCALE_KEY.SwUg, // Swahili (Uganda) Kiswahili (Uganda)
  ta: LOCALE_KEY.TaIn, // Tamil தமிழ்
  'ta-IN': LOCALE_KEY.TaIn, // Tamil (India) தமிழ் (இந்தியா)
  'ta-LK': LOCALE_KEY.TaIn, // Tamil (Sri Lanka) தமிழ் (இலங்கை)
  'ta-MY': LOCALE_KEY.TaIn, // Tamil (Malaysia) தமிழ் (மலேசியா)
  'ta-SG': LOCALE_KEY.TaIn, // Tamil (Singapore) தமிழ் (சிங்கப்பூர்)
  te: LOCALE_KEY.Te, // Telugu తెలుగు
  'te-IN': LOCALE_KEY.TeIn, // Telugu (India) తెలుగు (భారతదేశం)
  // 'teo', // Teso Kiteso
  // 'teo-KE', // Teso (Kenya) Kiteso (Kenia)
  // 'teo-UG', // Teso (Uganda) Kiteso (Uganda)
  // 'tg', // Tajik тоҷикӣ
  // 'tg-TJ', // Tajik (Tajikistan) тоҷикӣ (Тоҷикистон)
  th: LOCALE_KEY.ThTh, // Thai ไทย
  'th-TH': LOCALE_KEY.ThTh, // Thai (Thailand) ไทย (ไทย)
  // 'ti', // Tigrinya ትግርኛ
  // 'ti-ER', // Tigrinya (Eritrea) ትግርኛ (ኤርትራ)
  // 'ti-ET', // Tigrinya (Ethiopia) ትግርኛ (ኢትዮጵያ)
  // 'to', // Tongan lea fakatonga
  // 'to-TO', // Tongan (Tonga) lea fakatonga (Tonga)
  tr: LOCALE_KEY.TrTr, // Turkish Türkçe
  'tr-CY': LOCALE_KEY.TrTr, // Turkish (Cyprus) Türkçe (Kıbrıs)
  'tr-TR': LOCALE_KEY.TrTr, // Turkish (Turkey) Türkçe (Türkiye)
  // 'tt', // Tatar татар
  // 'tt-RU', // Tatar (Russia) татар (Россия)
  // 'twq', // Tasawaq Tasawaq senni
  // 'twq-NE', // Tasawaq (Niger) Tasawaq senni (Nižer)
  // 'tzm', // Central Atlas Tamazight Tamaziɣt n laṭlaṣ
  // 'tzm-MA', // Central Atlas Tamazight (Morocco) Tamaziɣt n laṭlaṣ (Meṛṛuk)
  // 'ug', // Uyghur ئۇيغۇرچە
  // 'ug-CN', // Uyghur (China) ئۇيغۇرچە (جۇڭگو)
  uk: LOCALE_KEY.UkUa, // Ukrainian українська
  'uk-UA': LOCALE_KEY.UkUa, // Ukrainian (Ukraine) українська (Україна)
  ur: LOCALE_KEY.Ur, // Urdu اردو
  'ur-IN': LOCALE_KEY.UrIn, // Urdu (India) اردو (بھارت)
  'ur-PK': LOCALE_KEY.UrPk, // Urdu (Pakistan) اردو (پاکستان)
  uz: LOCALE_KEY.Uz, // Uzbek o‘zbek
  'uz-Arab': LOCALE_KEY.Uz, // Uzbek (Arabic) اوزبیک (عربی)
  'uz-Arab-AF': LOCALE_KEY.Uz, // Uzbek (Arabic, Afghanistan) اوزبیک (عربی, افغانستان)
  'uz-Cyrl': LOCALE_KEY.Uz, // Uzbek (Cyrillic) ўзбекча (Кирил)
  'uz-Cyrl-UZ': LOCALE_KEY.Uz, // Uzbek (Cyrillic, Uzbekistan) ўзбекча (Кирил, Ўзбекистон)
  'uz-Latn': LOCALE_KEY.Uz, // Uzbek (Latin) o‘zbek (lotin)
  'uz-Latn-UZ': LOCALE_KEY.Uz, // Uzbek (Latin, Uzbekistan) o‘zbek (lotin, Oʻzbekiston)
  // 'vai', // Vai ꕙꔤ
  // 'vai-Latn', // Vai (Latin) Vai (Latn)
  // 'vai-Latn-LR', // Vai (Latin, Liberia) Vai (Latn, Laibhiya)
  // 'vai-Vaii', // Vai (Vai) ꕙꔤ (Vaii)
  // 'vai-Vaii-LR', // Vai (Vai, Liberia) ꕙꔤ (Vaii, ꕞꔤꔫꕩ)
  vi: LOCALE_KEY.ViVn, // Vietnamese Tiếng Việt
  'vi-VN': LOCALE_KEY.ViVn, // Vietnamese (Vietnam) Tiếng Việt (Việt Nam)
  // 'vun', // Vunjo Kyivunjo
  // 'vun-TZ', // Vunjo (Tanzania) Kyivunjo (Tanzania)
  // 'wae', // Walser Walser
  // 'wae-CH', // Walser (Switzerland) Walser (Schwiz)
  // 'wo', // Wolof Wolof
  // 'wo-SN', // Wolof (Senegal) Wolof (Senegaal)
  // 'xog', // Soga Olusoga
  // 'xog-UG', // Soga (Uganda) Olusoga (Yuganda)
  // 'yav', // Yangben nuasue
  // 'yav-CM', // Yangben (Cameroon) nuasue (Kemelún)
  // 'yi', // Yiddish ייִדיש
  // 'yi-001', // Yiddish (World) ייִדיש (וועלט)
  // 'yo', // Yoruba Èdè Yorùbá
  // 'yo-BJ', // Yoruba (Benin) Èdè Yorùbá (Orílɛ́ède Bɛ̀nɛ̀)
  // 'yo-NG', // Yoruba (Nigeria) Èdè Yorùbá (Orílẹ́ède Nàìjíríà)
  yue: LOCALE_KEY.ZhHk, // Cantonese 粵語
  'yue-Hant': LOCALE_KEY.ZhHk, // Cantonese (Traditional) 粵語 (繁體)
  'yue-Hant-HK': LOCALE_KEY.ZhHk, // Cantonese (Traditional, Hong Kong SAR China) 粵語 (繁體，中華人民共和國香港特別行政區)
  'yue-Hans': LOCALE_KEY.ZhHans, // Cantonese (Simplified) 粤语 (简体)
  'yue-Hans-CN': LOCALE_KEY.ZhHans, // Cantonese (Simplified, China) 粤语 (简体，中华人民共和国)
  // 'zgh', // Standard Moroccan Tamazight ⵜⴰⵎⴰⵣⵉⵖⵜ
  // 'zgh-MA', // Standard Moroccan Tamazight (Morocco) ⵜⴰⵎⴰⵣⵉⵖⵜ (ⵍⵎⵖⵔⵉⴱ)
  zh: LOCALE_KEY.Zh, // Chinese 中文
  'zh-Hans': LOCALE_KEY.ZhHans, // Chinese (Simplified) 中文（简体） Simplified Chinese
  'zh-Hans-CN': LOCALE_KEY.ZhHans, // Chinese (Simplified, China) 中文（简体，中国） Simplified Chinese (China)
  'zh-Hans-SG': LOCALE_KEY.ZhHans, // Chinese (Simplified, Singapore) 中文（简体，新加坡） Simplified Chinese (Singapore)
  'zh-Hans-MO': LOCALE_KEY.ZhHans, // 中文（简体，中国澳门特别行政区） Simplified Chinese (Macau SAR China)
  'zh-Hans-HK': LOCALE_KEY.ZhHans, // 中文（简体，中国香港特别行政区） Simplified Chinese (Hong Kong SAR China)
  'zh-Hant': LOCALE_KEY.ZhTw, // Chinese (Traditional) 中文（繁體） Traditional Chinese
  'zh-Hant-MO': LOCALE_KEY.ZhHk, // 中文（繁體字，中國澳門特別行政區） Traditional Chinese (Macau SAR China)
  'zh-Hant-HK': LOCALE_KEY.ZhHk, // 中文（繁體字，中國香港特別行政區） Traditional Chinese (Hong Kong SAR China)
  'zh-Hant-TW': LOCALE_KEY.ZhTw, // Chinese (Traditional, Taiwan) 中文（繁體，台灣） Traditional Chinese (Taiwan)
  zu: LOCALE_KEY.ZuZa, // Zulu isiZulu
  'zu-ZA': LOCALE_KEY.ZuZa, // Zulu (South Africa) isiZulu (iNingizimu Afrika)
};

export const LOCALE_BROWSER_MAP: Record<string, LocaleValue> = localeBrowserMap;

/** Union of Browser locale keys */
export type BrowserLocaleKey = keyof typeof LOCALE_BROWSER_MAP;

/**
 * Native language names, used to render options to users
 * Language options for end-users should be written in own language
 */
export const NATIVE_LANGUAGE_NAMES: Record<LocaleValue, string> = {
  /* English */
  [LOCALE_KEY.En]: 'English',
  /* Arabic */
  [LOCALE_KEY.Ar]: 'العربية',
  /* French */
  [LOCALE_KEY.Fr]: 'Français',
  /* German */
  [LOCALE_KEY.De]: 'Deutsch',
  /* Spanish */
  [LOCALE_KEY.Es]: 'Español',
  /* Italian */
  [LOCALE_KEY.It]: 'Italiano',
  /* Japanese */
  [LOCALE_KEY.Ja]: '日本語',
  /* Russian */
  [LOCALE_KEY.Ru]: 'Русский язык',

  /* Afrikaans */
  [LOCALE_KEY.Af]: 'Afrikaans',
  /* Bulgarian */
  [LOCALE_KEY.Bg]: 'български',
  /* Chinese (base) */
  [LOCALE_KEY.Zh]: '中文',
  /* Croatian */
  [LOCALE_KEY.Hr]: 'Hrvatski',
  /* Czech */
  [LOCALE_KEY.Cs]: 'Čeština',
  /* Danish */
  [LOCALE_KEY.Da]: 'Dansk',
  /* Finnish */
  [LOCALE_KEY.Fi]: 'Suomi',
  /* Greek */
  [LOCALE_KEY.El]: 'Ελληνικά',
  /* Hindi */
  [LOCALE_KEY.Hi]: 'हिन्दी',
  /* Hungarian */
  [LOCALE_KEY.Hu]: 'Magyar',
  /* Indonesian */
  // TODO: https://linear.app/transcend/issue/GOOM-417/add-id-to-locale-key
  // [LOCALE_KEY.Id]: 'Bahasa Indonesia',
  /* Korean */
  [LOCALE_KEY.Ko]: '한국어',
  /* Lithuanian */
  [LOCALE_KEY.Lt]: 'Lietuvių',
  /* Malay */
  [LOCALE_KEY.Ms]: 'Bahasa Melayu',
  /* Marathi */
  [LOCALE_KEY.Mr]: 'मराठी',
  /* Norwegian Bokmål */
  [LOCALE_KEY.Nb]: 'Bokmål',
  /* Polish */
  [LOCALE_KEY.Pl]: 'Polski',
  /* Portuguese */
  [LOCALE_KEY.Pt]: 'Português',
  /* Romanian */
  [LOCALE_KEY.Ro]: 'Română',
  /* Serbian (unspecified script) */
  [LOCALE_KEY.Sr]: 'Српски / Srpski',
  /* Swedish */
  [LOCALE_KEY.Sv]: 'Svenska',
  /* Tamil */
  [LOCALE_KEY.Ta]: 'தமிழ்',
  /* Thai */
  [LOCALE_KEY.Th]: 'ภาษาไทย',
  /* Turkish */
  [LOCALE_KEY.Tr]: 'Türkçe',
  /* Ukrainian */
  [LOCALE_KEY.Uk]: 'Українська',
  /* Vietnamese */
  [LOCALE_KEY.Vi]: 'Tiếng Việt',
  /* Zulu */
  [LOCALE_KEY.Zu]: 'isiZulu',
  /* Hebrew */
  [LOCALE_KEY.He]: 'עברית',
  /* Dutch */
  [LOCALE_KEY.Nl]: 'Nederlands',
  /* Estonian */
  [LOCALE_KEY.Et]: 'Eesti',
  /* Icelandic */
  [LOCALE_KEY.Is]: 'Íslenska',
  /* Latvian */
  [LOCALE_KEY.Lv]: 'Latviešu',
  /* Maltese */
  [LOCALE_KEY.Mt]: 'Malti',
  /* Slovak */
  [LOCALE_KEY.Sk]: 'Slovenčina',
  /* Slovenian */
  [LOCALE_KEY.Sl]: 'Slovenščina',
  /* Filipino */
  [LOCALE_KEY.Fil]: 'Filipino',
  /* Bosnian */
  [LOCALE_KEY.Bs]: 'Bosanski',
  /* Catalan */
  [LOCALE_KEY.Ca]: 'Català',
  /* Basque */
  [LOCALE_KEY.Eu]: 'Euskara',
  /* Galician */
  [LOCALE_KEY.Gl]: 'Galego',
  /* Dhivehi */
  [LOCALE_KEY.Dv]: 'ދިވެހިބަސް',
  /* Urdu */
  [LOCALE_KEY.Ur]: 'اردو',
  /* Albanian */
  [LOCALE_KEY.Sq]: 'Shqip',
  /* Amharic */
  [LOCALE_KEY.Am]: 'አማርኛ',
  /* Armenian */
  [LOCALE_KEY.Hy]: 'Հայերեն',
  /* Azerbaijani */
  [LOCALE_KEY.Az]: 'Azərbaycan dili',
  /* Bengali */
  [LOCALE_KEY.Bn]: 'বাংলা',
  /* Dari */
  [LOCALE_KEY.FaAf]: 'دری',
  /* Tagalog */
  [LOCALE_KEY.Tl]: 'Tagalog',
  /* Georgian */
  [LOCALE_KEY.Ka]: 'ქართული',
  /* Gujarati */
  [LOCALE_KEY.Gu]: 'ગુજરાતી',
  /* Haitian Creole */
  [LOCALE_KEY.Ht]: 'Kreyòl Ayisyen',
  /* Hausa */
  [LOCALE_KEY.Ha]: 'Hausa',
  /* Irish */
  [LOCALE_KEY.Ga]: 'Gaeilge',
  /* Kannada */
  [LOCALE_KEY.Kn]: 'ಕನ್ನಡ',
  /* Kazakh */
  [LOCALE_KEY.Kk]: 'Қазақ тілі',
  /* Macedonian */
  [LOCALE_KEY.Mk]: 'Македонски',
  /* Malayalam */
  [LOCALE_KEY.Ml]: 'മലയാളം',
  /* Mongolian */
  [LOCALE_KEY.Mn]: 'Монгол',
  /* Pashto */
  [LOCALE_KEY.Ps]: 'پښتو',
  /* Punjabi */
  [LOCALE_KEY.Pa]: 'ਪੰਜਾਬੀ',
  /* Sinhala */
  [LOCALE_KEY.Si]: 'සිංහල',
  /* Somali */
  [LOCALE_KEY.So]: 'Soomaali',
  /* Swahili */
  [LOCALE_KEY.Sw]: 'Kiswahili',
  /* Telugu */
  [LOCALE_KEY.Te]: 'తెలుగు',
  /* Uzbek */
  [LOCALE_KEY.Uz]: 'Oʻzbek',
  /* Welsh */
  [LOCALE_KEY.Cy]: 'Cymraeg',

  /* Arabic UAE */
  [LOCALE_KEY.ArAe]: 'العربية (الإمارات العربية المتحدة)',
  /* French (France) */
  [LOCALE_KEY.FrFr]: 'Français (France)',
  /* German (Germany) */
  [LOCALE_KEY.DeDe]: 'Deutsch (Deutschland)',
  /* Italian (Italy) */
  [LOCALE_KEY.ItIt]: 'Italiano (Italia)',

  /* Afrikaans */
  [LOCALE_KEY.AfZz]: 'Afrikaans',
  /* Bulgarian */
  [LOCALE_KEY.BgBg]: 'български',
  /* Chinese Simplified */
  [LOCALE_KEY.ZhCn]: '汉语',
  /* Chinese Simplified */
  [LOCALE_KEY.ZhHans]: '汉语（简体）',
  /* Croatian */
  [LOCALE_KEY.HrHr]: 'Hrvatski',
  /* Czech */
  [LOCALE_KEY.CsCz]: 'Čeština',
  /* Danish */
  [LOCALE_KEY.DaDk]: 'Dansk',
  /* English (UK) */
  [LOCALE_KEY.EnGb]: 'English (UK)',
  /* English (Canada) */
  [LOCALE_KEY.EnCa]: 'English (Canada)',
  /* English (UAE) */
  [LOCALE_KEY.EnAe]: 'English (UAE)',

  /* Finnish */
  [LOCALE_KEY.FiFi]: 'Suomi',
  /* Greek */
  [LOCALE_KEY.ElGr]: 'Ελληνικά',
  /* Hindi */
  [LOCALE_KEY.HiIn]: 'हिन्दी',
  /* Hungarian */
  [LOCALE_KEY.HuHu]: 'Magyar',
  /* Indonesian */
  [LOCALE_KEY.IdId]: 'Bahasa Indonesia',
  /* Japanese */
  [LOCALE_KEY.JaJp]: '日本語',
  /* Korean */
  [LOCALE_KEY.KoKr]: '한국어',
  /* Lithuanian */
  [LOCALE_KEY.LtLt]: 'Lietuvių',
  /* Malay */
  [LOCALE_KEY.MsMy]: 'Bahasa Melayu',
  /* Marathi */
  [LOCALE_KEY.MrIn]: 'मराठी',
  /* Norwegian Bokmål */
  [LOCALE_KEY.NbNi]: 'Bokmål',
  /* Polish */
  [LOCALE_KEY.PlPl]: 'Polski',
  /* Portuguese (Brazil) */
  [LOCALE_KEY.PtBr]: 'Português (Brasil)',
  /* Portuguese (Portugal) */
  [LOCALE_KEY.PtPt]: 'Português (Portugal)',
  /* Romanian */
  [LOCALE_KEY.RoRo]: 'Română',
  /* Russian */
  [LOCALE_KEY.RuRu]: 'Русский язык',
  /* Serbian (Latin, Serbia) */
  [LOCALE_KEY.SrLatnRs]: 'Srpski (latinica)',
  /* Swedish */
  [LOCALE_KEY.SvSe]: 'Svenska',
  /* Tamil */
  [LOCALE_KEY.TaIn]: 'தமிழ்',
  /* Thai */
  [LOCALE_KEY.ThTh]: 'ภาษาไทย',
  /* Turkish */
  [LOCALE_KEY.TrTr]: 'Türkçe',
  /* Ukrainian */
  [LOCALE_KEY.UkUa]: 'Українська',
  /* Vietnamese */
  [LOCALE_KEY.ViVn]: 'Tiếng Việt',
  /* Zulu */
  [LOCALE_KEY.ZuZa]: 'isiZulu',
  /* English (US) */
  [LOCALE_KEY.EnUs]: 'English (US)',
  /* English (Australia) */
  [LOCALE_KEY.EnAu]: 'English (Australia)',
  /* English (Ireland) */
  [LOCALE_KEY.EnIe]: 'English (Ireland)',
  /* English (New Zealand) */
  [LOCALE_KEY.EnNz]: 'English (New Zealand)',

  /* Dutch */
  [LOCALE_KEY.NlNl]: 'Nederlands',
  /* Dutch (Belgium) */
  [LOCALE_KEY.NlBe]: 'Nederlands (België)',

  /* Spanish (Spain) */
  [LOCALE_KEY.EsEs]: 'Español (España)',
  /* Spanish (Latin America & Caribbean) */
  [LOCALE_KEY.Es419]: 'Español (América Latina)',

  /* Chinese (Traditional, Hong Kong) */
  [LOCALE_KEY.ZhHk]: '繁體中文（香港）',

  /* French (Belgium) */
  [LOCALE_KEY.FrBe]: 'Français (Belgique)',
  /* French (Canada/Québec) */
  [LOCALE_KEY.FrCa]: 'Français (Québec)',
  /* French (Switzerland) */
  [LOCALE_KEY.FrCh]: 'Français (Suisse)',

  /* Hebrew (Israel) */
  [LOCALE_KEY.HeIl]: 'עברית',
  /* Estonian (Estonia) */
  [LOCALE_KEY.EtEe]: 'Eesti',
  /* Icelandic (Iceland) */
  [LOCALE_KEY.IsIs]: 'Íslenska',
  /* Latvian (Latvia) */
  [LOCALE_KEY.LvLv]: 'Latviešu',
  /* Maltese (Malta) */
  [LOCALE_KEY.MtMt]: 'Malti',
  /* Slovak (Slovakia) */
  [LOCALE_KEY.SkSk]: 'Slovenčina',
  /* Slovenian (Slovenia) */
  [LOCALE_KEY.SlSl]: 'Slovenščina',

  /* ===== Region/script variants (not previously listed) ===== */

  /* German (Austria) */
  [LOCALE_KEY.DeAt]: 'Deutsch (Österreich)',
  /* German (Switzerland) */
  [LOCALE_KEY.DeCh]: 'Deutsch (Schweiz)',

  /* Italian (Switzerland) */
  [LOCALE_KEY.ItCh]: 'Italiano (Svizzera)',

  /* Chinese (Traditional, Taiwan) */
  [LOCALE_KEY.ZhTw]: '繁體中文（台灣）',

  /* Malay (Singapore) */
  [LOCALE_KEY.MsSg]: 'Bahasa Melayu (Singapura)',

  /* Serbian (Cyrillic, Serbia) */
  [LOCALE_KEY.SrCyrlRs]: 'Српски (ћирилица)',

  /* Spanish (Argentina) */
  [LOCALE_KEY.EsAr]: 'Español (Argentina)',
  /* Spanish (Costa Rica) */
  [LOCALE_KEY.EsCr]: 'Español (Costa Rica)',
  /* Spanish (Chile) */
  [LOCALE_KEY.EsCl]: 'Español (Chile)',
  /* Spanish (Colombia) */
  [LOCALE_KEY.EsCo]: 'Español (Colombia)',
  /* Spanish (Mexico) */
  [LOCALE_KEY.EsMx]: 'Español (México)',

  /* Filipino (Philippines) */
  [LOCALE_KEY.FilPh]: 'Filipino (Pilipinas)',
  /* Tagalog (Philippines) */
  [LOCALE_KEY.TlPh]: 'Tagalog (Pilipinas)',

  /* Albanian (Albania) */
  [LOCALE_KEY.SqAl]: 'Shqip (Shqipëri)',
  /* Albanian (North Macedonia) */
  [LOCALE_KEY.SqMk]: 'Shqip (Maqedoni)',
  /* Albanian (Kosovo) */
  [LOCALE_KEY.SqXk]: 'Shqip (Kosovë)',

  /* Amharic (Ethiopia) */
  [LOCALE_KEY.AmEt]: 'አማርኛ (ኢትዮጵያ)',

  /* Armenian (Armenia) */
  [LOCALE_KEY.HyAm]: 'Հայերեն (Հայաստան)',

  /* Azerbaijani (Azerbaijan) */
  [LOCALE_KEY.AzAz]: 'Azərbaycan dili (Azərbaycan)',

  /* Bengali (Bangladesh) */
  [LOCALE_KEY.BnBd]: 'বাংলা (বাংলাদেশ)',
  /* Bengali (India) */
  [LOCALE_KEY.BnIn]: 'বাংলা (ভারত)',

  /* Bosnian (Bosnia & Herzegovina) */
  [LOCALE_KEY.BsBa]: 'Bosanski (Bosna i Hercegovina)',
  /* Bosnian (Cyrillic, Bosnia & Herzegovina) */
  [LOCALE_KEY.BsCyrlBa]: 'Босански (Ћирилица, Босна и Херцеговина)',
  /* Bosnian (Latin, Bosnia & Herzegovina) */
  [LOCALE_KEY.BsLatnBa]: 'Bosanski (Latinica, Bosna i Hercegovina)',

  /* Catalan (Spain) */
  [LOCALE_KEY.CaEs]: 'Català (Espanya)',
  /* Catalan (Andorra) */
  [LOCALE_KEY.CaAd]: 'Català (Andorra)',
  /* Catalan (France) */
  [LOCALE_KEY.CaFr]: 'Català (França)',
  /* Catalan (Italy) */
  [LOCALE_KEY.CaIt]: 'Català (Itàlia)',

  /* Georgian (Georgia) */
  [LOCALE_KEY.KaGe]: 'ქართული (საქართველო)',

  /* Gujarati (India) */
  [LOCALE_KEY.GuIn]: 'ગુજરાતી (ભારત)',

  /* Haitian Creole (Haiti) */
  [LOCALE_KEY.HtHt]: 'Kreyòl Ayisyen (Ayiti)',

  /* Hausa (Nigeria) */
  [LOCALE_KEY.HaNg]: 'Hausa (Nigeria)',
  /* Hausa (Niger) */
  [LOCALE_KEY.HaNe]: 'Hausa (Niger)',
  /* Hausa (Ghana) */
  [LOCALE_KEY.HaGh]: 'Hausa (Ghana)',

  /* Irish (Ireland) */
  [LOCALE_KEY.GaIe]: 'Gaeilge (Éire)',

  /* Kannada (India) */
  [LOCALE_KEY.KnIn]: 'ಕನ್ನಡ (ಭಾರತ)',

  /* Kazakh (Kazakhstan) */
  [LOCALE_KEY.KkKz]: 'Қазақ тілі (Қазақстан)',

  /* Macedonian (North Macedonia) */
  [LOCALE_KEY.MkMk]: 'Македонски (Македонија)',

  /* Malayalam (India) */
  [LOCALE_KEY.MlIn]: 'മലയാളം (ഇന്ത്യ)',

  /* Mongolian (Mongolia) */
  [LOCALE_KEY.MnMn]: 'Монгол (Монгол)',

  /* Pashto (Afghanistan) */
  [LOCALE_KEY.PsAf]: 'پښتو (افغانिस्तान)',

  /* Punjabi (India) */
  [LOCALE_KEY.PaIn]: 'ਪੰਜਾਬੀ (ਭਾਰਤ)',
  /* Punjabi (Pakistan) */
  [LOCALE_KEY.PaPk]: 'ਪنجابی (پاکستان)',

  /* Sinhala (Sri Lanka) */
  [LOCALE_KEY.SiLk]: 'සිංහල (ශ්‍රී ලංකාව)',

  /* Somali (Somalia) */
  [LOCALE_KEY.SoSo]: 'Soomaali (Soomaaliya)',
  /* Somali (Djibouti) */
  [LOCALE_KEY.SoDj]: 'Soomaali (Jabuuti)',
  /* Somali (Ethiopia) */
  [LOCALE_KEY.SoEt]: 'Soomaali (Itoobiya)',
  /* Somali (Kenya) */
  [LOCALE_KEY.SoKe]: 'Soomaali (Kiiniya)',

  /* Swahili (Kenya) */
  [LOCALE_KEY.SwKe]: 'Kiswahili (Kenya)',
  /* Swahili (Tanzania) */
  [LOCALE_KEY.SwTz]: 'Kiswahili (Tanzania)',
  /* Swahili (Uganda) */
  [LOCALE_KEY.SwUg]: 'Kiswahili (Uganda)',
  /* Swahili (Congo - Kinshasa) */
  [LOCALE_KEY.SwCd]: 'Kiswahili (Jamhuri ya Kidemokrasia ya Kongo)',

  /* Telugu (India) */
  [LOCALE_KEY.TeIn]: 'తెలుగు (భారతదేశం)',

  /* Urdu (Pakistan) */
  [LOCALE_KEY.UrPk]: 'اردو (پاکستان)',
  /* Urdu (India) */
  [LOCALE_KEY.UrIn]: 'اردو (بھارت)',

  /* Uzbek (Uzbekistan) */
  [LOCALE_KEY.UzUz]: 'Oʻzbek (Oʻzbekiston)',

  /* Welsh (United Kingdom) */
  [LOCALE_KEY.CyGb]: 'Cymraeg (Y Deyrnas Unedig)',

  /* Basque (Spain) */
  [LOCALE_KEY.EuEs]: 'Euskara (Espainia)',

  /* Galician (Spain) */
  [LOCALE_KEY.GlEs]: 'Galego (España)',
};

/**
 * English display names (fallback/default mapping).
 * Useful for admin UI, debugging, or when localization files are missing.
 */
export const EN_LANGUAGE_NAMES: Record<LocaleValue, string> = {
  /* ===== Base languages ===== */
  [LOCALE_KEY.En]: 'English',
  [LOCALE_KEY.Ar]: 'Arabic',
  [LOCALE_KEY.Fr]: 'French',
  [LOCALE_KEY.Es]: 'Spanish',
  [LOCALE_KEY.De]: 'German',
  [LOCALE_KEY.It]: 'Italian',
  [LOCALE_KEY.Ja]: 'Japanese',
  [LOCALE_KEY.Ru]: 'Russian',

  [LOCALE_KEY.Af]: 'Afrikaans',
  [LOCALE_KEY.Bg]: 'Bulgarian',
  [LOCALE_KEY.Zh]: 'Chinese',
  [LOCALE_KEY.Hr]: 'Croatian',
  [LOCALE_KEY.Cs]: 'Czech',
  [LOCALE_KEY.Da]: 'Danish',
  [LOCALE_KEY.Fi]: 'Finnish',
  [LOCALE_KEY.El]: 'Greek',
  [LOCALE_KEY.Hi]: 'Hindi',
  [LOCALE_KEY.Hu]: 'Hungarian',
  // TODO: https://linear.app/transcend/issue/GOOM-417/add-id-to-locale-key
  // [LOCALE_KEY.Id]: 'Indonesian',
  [LOCALE_KEY.Ko]: 'Korean',
  [LOCALE_KEY.Lt]: 'Lithuanian',
  [LOCALE_KEY.Ms]: 'Malay',
  [LOCALE_KEY.Mr]: 'Marathi',
  [LOCALE_KEY.Nb]: 'Norwegian Bokmål',
  [LOCALE_KEY.Pl]: 'Polish',
  [LOCALE_KEY.Pt]: 'Portuguese',
  [LOCALE_KEY.Ro]: 'Romanian',
  [LOCALE_KEY.Sr]: 'Serbian',
  [LOCALE_KEY.Sv]: 'Swedish',
  [LOCALE_KEY.Ta]: 'Tamil',
  [LOCALE_KEY.Th]: 'Thai',
  [LOCALE_KEY.Tr]: 'Turkish',
  [LOCALE_KEY.Uk]: 'Ukrainian',
  [LOCALE_KEY.Vi]: 'Vietnamese',
  [LOCALE_KEY.Zu]: 'Zulu',
  [LOCALE_KEY.He]: 'Hebrew',
  [LOCALE_KEY.Nl]: 'Dutch',
  [LOCALE_KEY.Et]: 'Estonian',
  [LOCALE_KEY.Is]: 'Icelandic',
  [LOCALE_KEY.Lv]: 'Latvian',
  [LOCALE_KEY.Mt]: 'Maltese',
  [LOCALE_KEY.Sk]: 'Slovak',
  [LOCALE_KEY.Sl]: 'Slovenian',
  [LOCALE_KEY.Fil]: 'Filipino',
  [LOCALE_KEY.Bs]: 'Bosnian',
  [LOCALE_KEY.Ca]: 'Catalan',
  [LOCALE_KEY.Eu]: 'Basque',
  [LOCALE_KEY.Gl]: 'Galician',
  [LOCALE_KEY.Dv]: 'Dhivehi',
  [LOCALE_KEY.Ur]: 'Urdu',
  [LOCALE_KEY.Sq]: 'Albanian',
  [LOCALE_KEY.Am]: 'Amharic',
  [LOCALE_KEY.Hy]: 'Armenian',
  [LOCALE_KEY.Az]: 'Azerbaijani',
  [LOCALE_KEY.Bn]: 'Bengali',
  [LOCALE_KEY.FaAf]: 'Dari',
  [LOCALE_KEY.Tl]: 'Tagalog',
  [LOCALE_KEY.Ka]: 'Georgian',
  [LOCALE_KEY.Gu]: 'Gujarati',
  [LOCALE_KEY.Ht]: 'Haitian Creole',
  [LOCALE_KEY.Ha]: 'Hausa',
  [LOCALE_KEY.Ga]: 'Irish',
  [LOCALE_KEY.Kn]: 'Kannada',
  [LOCALE_KEY.Kk]: 'Kazakh',
  [LOCALE_KEY.Mk]: 'Macedonian',
  [LOCALE_KEY.Ml]: 'Malayalam',
  [LOCALE_KEY.Mn]: 'Mongolian',
  [LOCALE_KEY.Ps]: 'Pashto',
  [LOCALE_KEY.Pa]: 'Punjabi',
  [LOCALE_KEY.Si]: 'Sinhala',
  [LOCALE_KEY.So]: 'Somali',
  [LOCALE_KEY.Sw]: 'Swahili',
  [LOCALE_KEY.Te]: 'Telugu',
  [LOCALE_KEY.Uz]: 'Uzbek',
  [LOCALE_KEY.Cy]: 'Welsh',

  /* ===== Region/script variants ===== */
  [LOCALE_KEY.ArAe]: 'Arabic (United Arab Emirates)',
  [LOCALE_KEY.FrFr]: 'French (France)',
  [LOCALE_KEY.DeDe]: 'German (Germany)',
  [LOCALE_KEY.ItIt]: 'Italian (Italy)',

  [LOCALE_KEY.AfZz]: 'Afrikaans',
  [LOCALE_KEY.BgBg]: 'Bulgarian',
  [LOCALE_KEY.ZhCn]: 'Chinese (Simplified)',
  [LOCALE_KEY.ZhHans]: 'Chinese (Simplified)',
  [LOCALE_KEY.HrHr]: 'Croatian',
  [LOCALE_KEY.CsCz]: 'Czech',
  [LOCALE_KEY.DaDk]: 'Danish',
  [LOCALE_KEY.EnGb]: 'English (United Kingdom)',
  [LOCALE_KEY.EnCa]: 'English (Canada)',
  [LOCALE_KEY.EnAe]: 'English (United Arab Emirates)',
  [LOCALE_KEY.FiFi]: 'Finnish',
  [LOCALE_KEY.ElGr]: 'Greek',
  [LOCALE_KEY.HiIn]: 'Hindi (India)',
  [LOCALE_KEY.HuHu]: 'Hungarian',
  [LOCALE_KEY.IdId]: 'Indonesian',
  [LOCALE_KEY.JaJp]: 'Japanese',
  [LOCALE_KEY.KoKr]: 'Korean',
  [LOCALE_KEY.LtLt]: 'Lithuanian',
  [LOCALE_KEY.MsMy]: 'Malay (Malaysia)',
  [LOCALE_KEY.MrIn]: 'Marathi (India)',
  [LOCALE_KEY.NbNi]: 'Norwegian Bokmål', // key as provided
  [LOCALE_KEY.PlPl]: 'Polish',
  [LOCALE_KEY.PtBr]: 'Portuguese (Brazil)',
  [LOCALE_KEY.PtPt]: 'Portuguese (Portugal)',
  [LOCALE_KEY.RoRo]: 'Romanian',
  [LOCALE_KEY.RuRu]: 'Russian',
  [LOCALE_KEY.SrLatnRs]: 'Serbian (Latin, Serbia)',
  [LOCALE_KEY.SvSe]: 'Swedish',
  [LOCALE_KEY.TaIn]: 'Tamil (India)',
  [LOCALE_KEY.ThTh]: 'Thai (Thailand)',
  [LOCALE_KEY.TrTr]: 'Turkish',
  [LOCALE_KEY.UkUa]: 'Ukrainian',
  [LOCALE_KEY.ViVn]: 'Vietnamese',
  [LOCALE_KEY.ZuZa]: 'Zulu (South Africa)',
  [LOCALE_KEY.EnUs]: 'English (United States)',
  [LOCALE_KEY.EnAu]: 'English (Australia)',
  [LOCALE_KEY.EnIe]: 'English (Ireland)',
  [LOCALE_KEY.EnNz]: 'English (New Zealand)',
  [LOCALE_KEY.NlNl]: 'Dutch (Netherlands)',
  [LOCALE_KEY.NlBe]: 'Dutch (Belgium)',
  [LOCALE_KEY.EsEs]: 'Spanish (Spain)',
  [LOCALE_KEY.Es419]: 'Spanish (Latin America & Caribbean)',
  [LOCALE_KEY.ZhHk]: 'Chinese (Traditional, Hong Kong)',
  [LOCALE_KEY.FrBe]: 'French (Belgium)',
  [LOCALE_KEY.FrCa]: 'French (Canada/Québec)',
  [LOCALE_KEY.FrCh]: 'French (Switzerland)',
  [LOCALE_KEY.HeIl]: 'Hebrew (Israel)',
  [LOCALE_KEY.EtEe]: 'Estonian (Estonia)',
  [LOCALE_KEY.IsIs]: 'Icelandic (Iceland)',
  [LOCALE_KEY.LvLv]: 'Latvian (Latvia)',
  [LOCALE_KEY.MtMt]: 'Maltese (Malta)',
  [LOCALE_KEY.SkSk]: 'Slovak (Slovakia)',
  [LOCALE_KEY.SlSl]: 'Slovenian (Slovenia)',

  [LOCALE_KEY.DeAt]: 'German (Austria)',
  [LOCALE_KEY.DeCh]: 'German (Switzerland)',
  [LOCALE_KEY.ItCh]: 'Italian (Switzerland)',
  [LOCALE_KEY.ZhTw]: 'Chinese (Traditional, Taiwan)',
  [LOCALE_KEY.MsSg]: 'Malay (Singapore)',
  [LOCALE_KEY.SrCyrlRs]: 'Serbian (Cyrillic, Serbia)',

  [LOCALE_KEY.EsAr]: 'Spanish (Argentina)',
  [LOCALE_KEY.EsCr]: 'Spanish (Costa Rica)',
  [LOCALE_KEY.EsCl]: 'Spanish (Chile)',
  [LOCALE_KEY.EsCo]: 'Spanish (Colombia)',
  [LOCALE_KEY.EsMx]: 'Spanish (Mexico)',

  [LOCALE_KEY.FilPh]: 'Filipino (Philippines)',
  [LOCALE_KEY.TlPh]: 'Tagalog (Philippines)',

  [LOCALE_KEY.SqAl]: 'Albanian (Albania)',
  [LOCALE_KEY.SqMk]: 'Albanian (North Macedonia)',
  [LOCALE_KEY.SqXk]: 'Albanian (Kosovo)',

  [LOCALE_KEY.AmEt]: 'Amharic (Ethiopia)',
  [LOCALE_KEY.HyAm]: 'Armenian (Armenia)',
  [LOCALE_KEY.AzAz]: 'Azerbaijani (Azerbaijan)',
  [LOCALE_KEY.BnBd]: 'Bengali (Bangladesh)',
  [LOCALE_KEY.BnIn]: 'Bengali (India)',

  [LOCALE_KEY.BsBa]: 'Bosnian (Bosnia & Herzegovina)',
  [LOCALE_KEY.BsCyrlBa]: 'Bosnian (Cyrillic, Bosnia & Herzegovina)',
  [LOCALE_KEY.BsLatnBa]: 'Bosnian (Latin, Bosnia & Herzegovina)',

  [LOCALE_KEY.CaEs]: 'Catalan (Spain)',
  [LOCALE_KEY.CaAd]: 'Catalan (Andorra)',
  [LOCALE_KEY.CaFr]: 'Catalan (France)',
  [LOCALE_KEY.CaIt]: 'Catalan (Italy)',

  [LOCALE_KEY.KaGe]: 'Georgian (Georgia)',
  [LOCALE_KEY.GuIn]: 'Gujarati (India)',
  [LOCALE_KEY.HtHt]: 'Haitian Creole (Haiti)',

  [LOCALE_KEY.HaNg]: 'Hausa (Nigeria)',
  [LOCALE_KEY.HaNe]: 'Hausa (Niger)',
  [LOCALE_KEY.HaGh]: 'Hausa (Ghana)',

  [LOCALE_KEY.GaIe]: 'Irish (Ireland)',
  [LOCALE_KEY.KnIn]: 'Kannada (India)',
  [LOCALE_KEY.KkKz]: 'Kazakh (Kazakhstan)',
  [LOCALE_KEY.MkMk]: 'Macedonian (North Macedonia)',
  [LOCALE_KEY.MlIn]: 'Malayalam (India)',
  [LOCALE_KEY.MnMn]: 'Mongolian (Mongolia)',
  [LOCALE_KEY.PsAf]: 'Pashto (Afghanistan)',
  [LOCALE_KEY.PaIn]: 'Punjabi (India)',
  [LOCALE_KEY.PaPk]: 'Punjabi (Pakistan)',
  [LOCALE_KEY.SiLk]: 'Sinhala (Sri Lanka)',

  [LOCALE_KEY.SoSo]: 'Somali (Somalia)',
  [LOCALE_KEY.SoDj]: 'Somali (Djibouti)',
  [LOCALE_KEY.SoEt]: 'Somali (Ethiopia)',
  [LOCALE_KEY.SoKe]: 'Somali (Kenya)',

  [LOCALE_KEY.SwKe]: 'Swahili (Kenya)',
  [LOCALE_KEY.SwTz]: 'Swahili (Tanzania)',
  [LOCALE_KEY.SwUg]: 'Swahili (Uganda)',
  [LOCALE_KEY.SwCd]: 'Swahili (DR Congo)',

  [LOCALE_KEY.TeIn]: 'Telugu (India)',
  [LOCALE_KEY.UrPk]: 'Urdu (Pakistan)',
  [LOCALE_KEY.UrIn]: 'Urdu (India)',
  [LOCALE_KEY.UzUz]: 'Uzbek (Uzbekistan)',
  [LOCALE_KEY.CyGb]: 'Welsh (United Kingdom)',
  [LOCALE_KEY.EuEs]: 'Basque (Spain)',
  [LOCALE_KEY.GlEs]: 'Galician (Spain)',
};

/* eslint-enable max-lines */
