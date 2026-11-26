import * as pulumi from '@pulumi/pulumi';

import { GET_CONFIG_TOKEN } from '../plugin/schema.js';
import { withPluginDefaults } from './resourceOptions.js';

/** Arguments of {@link getConfig}. */
export interface GetConfigArgs {
  /** Sections to read, such as `dataSilos`. */
  resources: string[];
}

/** Result of {@link getConfig}. */
export interface GetConfigResult {
  /** The sections as transcend.yml text. */
  yaml: string;
}

/**
 * Read sections of the organization configuration as transcend.yml.
 *
 * @param args - Sections to read
 * @param opts - Invoke options, such as an explicit provider
 * @returns The sections as YAML
 */
export function getConfig(
  args: GetConfigArgs,
  opts?: pulumi.InvokeOptions,
): Promise<GetConfigResult> {
  return pulumi.runtime
    .invoke(GET_CONFIG_TOKEN, args, withPluginDefaults(opts))
    .then((result) => result as GetConfigResult);
}
