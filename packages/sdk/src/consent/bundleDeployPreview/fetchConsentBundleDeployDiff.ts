import { ConsentBundleType } from '@transcend-io/privacy-types';
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
import {
  cdnOriginFromBundleUrl,
  fetchDeployedCompanionModules,
  parseConsentBundleConfigJson,
} from './bundleDeployFetchHelpers.js';
import type { ConsentBundleDeployDiffInputs } from './types.js';

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

  const json = configResp.consentManagerConfigurationJson.consentManagerConfigurationJson;
  const rawPending = isTest ? json.testConfigurationJson : json.configurationJson;
  const pending = parseConsentBundleConfigJson(rawPending);

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
