import * as pulumi from '@pulumi/pulumi';

import { CONFIG_TYPE_TOKEN } from '../plugin/schema.js';
import { withPluginDefaults } from './resourceOptions.js';

/** Inputs of a {@link Config}. Set exactly one of `yaml` and `content`. */
export interface ConfigArgs {
  /** transcend.yml as text. Use `variables` for <<parameters.name>> placeholders. */
  yaml?: pulumi.Input<string>;
  /** transcend.yml as an object. Keys match the file, such as `data-silos`. */
  content?: pulumi.Input<Record<string, unknown>>;
  /** Values for <<parameters.name>> placeholders in `yaml`. */
  variables?: pulumi.Input<Record<string, pulumi.Input<string>>>;
  /** Delete attribute values that the configuration leaves out. Default false. */
  deleteExtraAttributeValues?: pulumi.Input<boolean>;
  /** Publish privacy center changes after the push. Default false. */
  publishToPrivacyCenter?: pulumi.Input<boolean>;
  /** Run service classification on data silos during the push. Default false. */
  classifyService?: pulumi.Input<boolean>;
  /** Records per API request. Default 50. */
  pageSize?: pulumi.Input<number>;
}

/**
 * A slice of an organization configuration, kept in sync with a transcend.yml
 * document. Removing the resource from the program does not delete anything in
 * the organization.
 */
export class Config extends pulumi.CustomResource {
  /** Sections of the configuration this resource pushed. */
  declare public readonly sections: pulumi.Output<string[]>;
  /** Non-fatal warnings from the last push. */
  declare public readonly warnings: pulumi.Output<string[]>;

  constructor(name: string, args: ConfigArgs, opts?: pulumi.CustomResourceOptions) {
    const variables = args.variables === undefined ? undefined : pulumi.secret(args.variables);
    super(
      CONFIG_TYPE_TOKEN,
      name,
      { ...args, variables, sections: undefined, warnings: undefined },
      withPluginDefaults({
        ...opts,
        additionalSecretOutputs: [
          ...new Set([...(opts?.additionalSecretOutputs ?? []), 'variables']),
        ],
      }),
    );
  }
}
