import {
  buildTranscendGraphQLClient,
  previewPush,
  pullTranscendConfiguration,
  syncConfigurationToTranscend,
} from '@transcend-io/sdk';

import type { CredentialStore } from '../credentials.js';

/** Everything the Config lifecycle calls out to, injected so tests can fake it. */
export interface ConfigDeps {
  /** Build an authenticated GraphQL client for the configured organization */
  buildClient(): ReturnType<typeof buildTranscendGraphQLClient>;
  /** Compare a configuration with the organization without writing */
  previewPush: typeof previewPush;
  /** Push a configuration to the organization */
  sync: typeof syncConfigurationToTranscend;
  /** Read the organization's configuration */
  pull: typeof pullTranscendConfiguration;
}

/**
 * Wire the lifecycle to the real SDK and the engine-provided credentials.
 *
 * @param credentials - Where API credentials come from
 * @returns Production dependencies
 */
export function buildConfigDeps(credentials: CredentialStore): ConfigDeps {
  return {
    buildClient: () => {
      const { url, apiKey } = credentials.resolve();
      return buildTranscendGraphQLClient(url, apiKey);
    },
    previewPush,
    sync: syncConfigurationToTranscend,
    pull: pullTranscendConfiguration,
  };
}
