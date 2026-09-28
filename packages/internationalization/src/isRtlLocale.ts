import { RTL_LANGS } from './enums.js';

/**
 * Whether a BCP 47 locale uses right-to-left text direction.
 * Regional variants (for example `ar-AE`) inherit direction from their base language subtag.
 */
export function isRtlLocale(locale: string): boolean {
  const baseLanguage = locale.split('-')[0]?.toLowerCase();
  if (!baseLanguage) {
    return false;
  }
  return (RTL_LANGS as readonly string[]).includes(baseLanguage);
}
