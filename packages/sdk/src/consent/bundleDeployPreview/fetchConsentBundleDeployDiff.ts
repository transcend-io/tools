import { ConsentBundleType } from '@transcend-io/privacy-types';
import got from 'got';
import type { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest } from '../../api/makeGraphQLRequest.js';
import {
  AIRGAP_BUNDLE_VERSIONS,
  CONSENT_MANAGER_CONFIGURATION_JSON,
  FETCH_CONSENT_MANAGER,
  type TranscendCliAirgapBundleVersionsResponse,
  type TranscendCliConsentManagerConfigurationJsonResponse,
  type TranscendCliFetchConsentManagerResponse,
} from '../gqls/consentManager.js';
import type { ConsentBundleDeployDiffInputs, PendingConsentBundleConfig } from './types.js';

const KNOWN_MODULE_KEYS = new Set(['tcfVendorsList', 'nativeAppConfig', 'stylesheet']);

function parseJsonObject(raw: string): PendingConsentBundleConfig {
  try {
    return JSON.parse(raw) as PendingConsentBundleConfig;
  } catch {
    return {};
  }
}

function cdnOriginFromBundleUrl(bundleUrl: string): string {
  try {
    return new URL(bundleUrl).origin;
  } catch {
    return 'https://transcend-cdn.com';
  }
}

async function fetchCdnJson(url: string): Promise<unknown> {
  try {
    return await got(url, { timeout: { request: 15_000 } }).json();
  } catch {
    return undefined;
  }
}

async function fetchCdnText(url: string): Promise<string> {
  try {
    return await got(url, { timeout: { request: 15_000 } }).text();
  } catch {
    return '';
  }
}

async function fetchDeployedCompanionModules(
  deployedCore: Record<string, unknown>,
  cdnOrigin: string,
): Promise<Partial<PendingConsentBundleConfig>> {
  const modules = deployedCore.modules as Record<string, { location?: string }> | undefined;
  if (!modules) return {};

  const out: Partial<PendingConsentBundleConfig> = {};

  const tcfLoc = modules.tcfVendorsList?.location;
  if (tcfLoc) out.tcf = await fetchCdnJson(`${cdnOrigin}/${tcfLoc}`);

  const nativeLoc = modules.nativeAppConfig?.location;
  if (nativeLoc) out.nativeApp = await fetchCdnJson(`${cdnOrigin}/${nativeLoc}`);

  const cssLoc = modules.stylesheet?.location;
  if (cssLoc) out.stylesheet = await fetchCdnText(`${cdnOrigin}/${cssLoc}`);

  const messages: Record<string, unknown> = {};
  for (const [key, mod] of Object.entries(modules)) {
    if (KNOWN_MODULE_KEYS.has(key) || key.startsWith('uiV2-') || !mod?.location) {
      continue;
    }
    messages[key] = await fetchCdnJson(`${cdnOrigin}/${mod.location}`);
  }
  if (Object.keys(messages).length > 0) out.messages = messages;

  const uiV2Messages: Record<string, unknown> = {};
  for (const [key, mod] of Object.entries(modules)) {
    if (!key.startsWith('uiV2-') || !mod?.location) continue;
    uiV2Messages[key] = await fetchCdnJson(`${cdnOrigin}/${mod.location}`);
  }
  if (Object.keys(uiV2Messages).length > 0) out.uiV2Messages = uiV2Messages;

  return out;
}

/**
 * Load pending and deployed consent bundle configuration for deploy preview.
 *
 * @param client - GraphQL client
 * @param input - Bundle ID and target environment
 * @returns Inputs for {@link diffConsentBundleDeploy}
 */
export async function fetchConsentBundleDeployDiff(
  client: GraphQLClient,
  input: {
    /** Airgap bundle ID */
    airgapBundleId: string;
    /** TEST or PRODUCTION */
    bundleType: ConsentBundleType;
  },
): Promise<ConsentBundleDeployDiffInputs> {
  const isTest = input.bundleType === ConsentBundleType.Test;

  const [configResp, versionsResp, managerResp] = await Promise.all([
    makeGraphQLRequest<TranscendCliConsentManagerConfigurationJsonResponse>(
      client,
      CONSENT_MANAGER_CONFIGURATION_JSON,
      { variables: { id: input.airgapBundleId } },
    ),
    makeGraphQLRequest<TranscendCliAirgapBundleVersionsResponse>(client, AIRGAP_BUNDLE_VERSIONS, {
      variables: { id: input.airgapBundleId, first: 1, input: { isTest } },
    }),
    makeGraphQLRequest<TranscendCliFetchConsentManagerResponse>(client, FETCH_CONSENT_MANAGER, {}),
  ]);

  const json = configResp.consentManagerConfigurationJson;
  const rawPending = isTest ? json.testConfigurationJson : json.configurationJson;
  const pending = parseJsonObject(rawPending);

  const versionNode = versionsResp.airgapBundleVersions.nodes[0];
  const firstDeploy = !versionNode?.coreConfig;
  const deployedCore =
    versionNode?.coreConfig && versionNode.coreConfig.length > 0
      ? (JSON.parse(versionNode.coreConfig) as Record<string, unknown>)
      : null;

  const bundleUrl = isTest
    ? managerResp.consentManager.consentManager.testBundleURL
    : managerResp.consentManager.consentManager.bundleURL;

  const deployedModules = deployedCore
    ? await fetchDeployedCompanionModules(deployedCore, cdnOriginFromBundleUrl(bundleUrl))
    : {};

  return {
    pending,
    deployedCore,
    deployedModules,
    lastDeployedAt: versionNode?.createdAt ?? null,
    firstDeploy,
    bundleUrl,
    useIabFramework: json.useIabFramework,
  };
}
