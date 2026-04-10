import { LOCALE_KEY, type LocaleValue } from './enums.js';

const validLocales = new Set<string>(Object.values(LOCALE_KEY));

/**
 * Test if a string is a locale that we support.
 *
 * @param locale - The locale to test
 * @returns True if the locale is supported by this package
 */
export function isKnownLocale(
  locale: string | string[] | boolean | undefined,
): locale is LocaleValue {
  return typeof locale === 'string' && validLocales.has(locale);
}
