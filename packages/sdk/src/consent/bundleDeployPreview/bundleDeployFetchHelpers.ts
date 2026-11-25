import got from 'got';

import type { PendingConsentBundleConfig } from './types.js';

/** CDN module names that are not locale message keys */
export const KNOWN_COMPANION_MODULE_KEYS = new Set([
  'tcfVendorsList',
  'nativeAppConfig',
  'stylesheet',
]);

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

  const out: Partial<PendingConsentBundleConfig> = {};

  const tcfLoc = modules.tcfVendorsList?.location;
  if (tcfLoc) out.tcf = await fetchConsentCdnJson(`${cdnOrigin}/${tcfLoc}`);

  const nativeLoc = modules.nativeAppConfig?.location;
  if (nativeLoc) out.nativeApp = await fetchConsentCdnJson(`${cdnOrigin}/${nativeLoc}`);

  const cssLoc = modules.stylesheet?.location;
  if (cssLoc) out.stylesheet = await fetchConsentCdnText(`${cdnOrigin}/${cssLoc}`);

  const messages: Record<string, unknown> = {};
  for (const [key, mod] of Object.entries(modules)) {
    if (KNOWN_COMPANION_MODULE_KEYS.has(key) || key.startsWith('uiV2-') || !mod?.location) {
      continue;
    }
    messages[key] = await fetchConsentCdnJson(`${cdnOrigin}/${mod.location}`);
  }
  if (Object.keys(messages).length > 0) out.messages = messages;

  const uiV2Messages: Record<string, unknown> = {};
  for (const [key, mod] of Object.entries(modules)) {
    if (!key.startsWith('uiV2-') || !mod?.location) continue;
    uiV2Messages[key] = await fetchConsentCdnJson(`${cdnOrigin}/${mod.location}`);
  }
  if (Object.keys(uiV2Messages).length > 0) out.uiV2Messages = uiV2Messages;

  return out;
}
