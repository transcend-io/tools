import * as pulumi from '@pulumi/pulumi';

import packageJson from '../../package.json' with { type: 'json' };
import { PLUGIN_DOWNLOAD_URL } from '../plugin/schema.js';

/**
 * Pin resources to the plugin version published with this package, and tell the
 * engine where to download it.
 *
 * @param opts - Options from the caller
 * @returns Options with version and plugin download URL set
 */
export function withPluginDefaults<T extends pulumi.ResourceOptions | pulumi.InvokeOptions>(
  opts: T | undefined,
): T {
  return pulumi.mergeOptions(
    { version: packageJson.version, pluginDownloadURL: PLUGIN_DOWNLOAD_URL },
    opts,
  ) as T;
}
