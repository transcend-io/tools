import { provider as pulumiProvider } from '@pulumi/pulumi';

import packageJson from '../../package.json' with { type: 'json' };
import { captureProviderConfig } from './captureProviderConfig.js';
import { buildConfigDeps } from './configResource/deps.js';
import { CredentialStore } from './credentials.js';
import { buildProvider } from './provider.js';

const credentials = new CredentialStore();
captureProviderConfig(credentials);

// The Pulumi Node plugin runner loads this file with `require`, which rejects a
// module graph that uses top-level await. Start the server without awaiting it.
pulumiProvider
  .main(
    buildProvider({ version: packageJson.version, deps: buildConfigDeps(credentials) }),
    process.argv.slice(2),
  )
  .catch((error: unknown) => {
    // The engine shows plugin stderr as the failure reason.
    // oxlint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  });
