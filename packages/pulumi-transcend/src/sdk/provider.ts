import * as pulumi from '@pulumi/pulumi';

import { PACKAGE_NAME } from '../plugin/schema.js';
import { withPluginDefaults } from './resourceOptions.js';

/** Credentials for one Transcend organization. */
export interface ProviderArgs {
  /** Transcend API key. Falls back to the TRANSCEND_API_KEY environment variable. */
  apiKey?: pulumi.Input<string>;
  /** Transcend API base URL. Use https://api.us.transcend.io for US hosting. Defaults to the EU API. */
  url?: pulumi.Input<string>;
}

/**
 * An explicit provider, for managing more than one organization in one program.
 */
export class Provider extends pulumi.ProviderResource {
  constructor(name: string, args: ProviderArgs = {}, opts?: pulumi.ResourceOptions) {
    super(
      PACKAGE_NAME,
      name,
      {
        apiKey: args.apiKey === undefined ? undefined : pulumi.secret(args.apiKey),
        url: args.url,
      },
      withPluginDefaults(opts),
    );
  }
}
