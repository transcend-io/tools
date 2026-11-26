import { LOCALE_KEY } from '@transcend-io/internationalization';
import { map } from '@transcend-io/utils';
import got from 'got';

import type { PendingConsentBundleConfig } from './types.js';

/** Max concurrent CDN requests per module group while loading a deployed bundle */
const MAX_CONCURRENT_CDN_FETCHES = 10;

/** Prefix of UI v2 message module keys, for example `uiV2-default-consent-en` */
const UI_V2_MODULE_PREFIX = 'uiV2-';

/**
 * Parse consent manager configuration JSON, returning an empty object on failure.
 *
 * @param raw - Serialized configuration from GraphQL
 * @returns Parsed config object
 */
export function parseConsentBundleConfigJson(raw: string): PendingConsentBundleConfig {
  try {
    return JSON.parse(raw) as PendingConsentBundleConfig;
  } catch {
    return {};
  }
}

/**
 * Resolve the CDN origin used to fetch deployed companion modules.
 *
 * @param bundleUrl - Production or test bundle script URL
 * @returns CDN origin (defaults to transcend-cdn.com when the URL is invalid)
 */
export function cdnOriginFromBundleUrl(bundleUrl: string): string {
  try {
    return new URL(bundleUrl).origin;
  } catch {
    return 'https://transcend-cdn.com';
  }
}

/**
 * Fetch JSON from the consent CDN, returning `undefined` when the request fails.
 *
 * @param url - Absolute CDN URL
 * @returns Parsed JSON body
 */
export async function fetchConsentCdnJson(url: string): Promise<unknown> {
  try {
    return await got(url, { timeout: { request: 15_000 } }).json();
  } catch {
    return undefined;
  }
}

/**
 * Fetch text from the consent CDN, returning an empty string when the request fails.
 *
 * @param url - Absolute CDN URL
 * @returns Response body text
 */
export async function fetchConsentCdnText(url: string): Promise<string> {
  try {
    return await got(url, { timeout: { request: 15_000 } }).text();
  } catch {
    return '';
  }
}

/**
 * Load companion modules for a deployed core snapshot from the CDN.
 *
 * Requests run in parallel. A bundle can list 60+ locale modules, and loading them
 * one at a time used up the host's 60 second tool call limit.
 *
 * @param deployedCore - Parsed deployed core module (includes `modules` map)
 * @param cdnOrigin - CDN origin derived from the bundle script URL
 * @returns Partial pending config with deployed module payloads
 */
export async function fetchDeployedCompanionModules(
  deployedCore: Record<string, unknown>,
  cdnOrigin: string,
): Promise<Partial<PendingConsentBundleConfig>> {
  const modules = deployedCore.modules as Record<string, { location?: string }> | undefined;
  if (!modules) return {};

  const urlFor = (location: string): string => `${cdnOrigin}/${location}`;
  const tcfLoc = modules.tcfVendorsList?.location;
  const nativeLoc = modules.nativeAppConfig?.location;
  const cssLoc = modules.stylesheet?.location;

  // Deployed locale modules are keyed by LOCALE_KEY names (`En`, `AfZz`). Pending
  // config uses locale codes (`en`, `af-ZA`), so key the results by code to compare.
  // Other module keys (`metadata`, `mobileUiLoadOptions`, ...) are not messages.
  const localeModuleKeys = Object.keys(modules).filter(
    (key): key is keyof typeof LOCALE_KEY =>
      Object.hasOwn(LOCALE_KEY, key) && !!modules[key]?.location,
  );
  const uiV2ModuleKeys = Object.keys(modules).filter(
    (key) => key.startsWith(UI_V2_MODULE_PREFIX) && !!modules[key]?.location,
  );

  const [tcf, nativeApp, stylesheet, localeEntries, uiV2Entries] = await Promise.all([
    tcfLoc ? fetchConsentCdnJson(urlFor(tcfLoc)) : undefined,
    nativeLoc ? fetchConsentCdnJson(urlFor(nativeLoc)) : undefined,
    cssLoc ? fetchConsentCdnText(urlFor(cssLoc)) : undefined,
    map(
      localeModuleKeys,
      async (key) =>
        [LOCALE_KEY[key], await fetchConsentCdnJson(urlFor(modules[key]!.location!))] as const,
      { concurrency: MAX_CONCURRENT_CDN_FETCHES },
    ),
    map(
      uiV2ModuleKeys,
      async (key) => [key, await fetchConsentCdnJson(urlFor(modules[key]!.location!))] as const,
      { concurrency: MAX_CONCURRENT_CDN_FETCHES },
    ),
  ]);

  const out: Partial<PendingConsentBundleConfig> = {};
  if (tcfLoc) out.tcf = tcf;
  if (nativeLoc) out.nativeApp = nativeApp;
  if (cssLoc) out.stylesheet = stylesheet;
  if (localeEntries.length > 0) out.messages = Object.fromEntries(localeEntries);
  if (uiV2Entries.length > 0) out.uiV2Messages = Object.fromEntries(uiV2Entries);
  return out;
}
