import type * as pulumi from '@pulumi/pulumi';

import type { ConfigDeps } from './configResource/deps.js';
import {
  applyConfig,
  checkConfig,
  diffConfig,
  newConfigId,
  parseImportId,
  pullConfigInputs,
} from './configResource/lifecycle.js';
import { buildSchema, CONFIG_TYPE_TOKEN, GET_CONFIG_TOKEN } from './schema.js';

type Properties = Record<string, unknown>;

/** The resource type is the third `::`-separated segment of a URN. */
function typeOfUrn(urn: string): string {
  return urn.split('::')[2] ?? '';
}

function assertConfigType(urn: string): void {
  const type = typeOfUrn(urn);
  if (type !== CONFIG_TYPE_TOKEN) throw new Error(`Unknown resource type ${type}`);
}

/**
 * Build the Pulumi provider that serves the `Config` resource and `getConfig`.
 *
 * @param options - Version to report and the services the lifecycle calls
 * @returns A provider for `pulumi.provider.main`
 */
export function buildProvider(options: {
  /** Provider version, reported to the engine */
  version: string;
  /** API access */
  deps: ConfigDeps;
}): pulumi.provider.Provider {
  const { version, deps } = options;
  return {
    version,
    getSchema: async () => buildSchema(version),

    async check(urn, _olds, news) {
      assertConfigType(urn);
      return { inputs: news, failures: checkConfig(news) };
    },

    async diff(_id, urn, olds, news) {
      assertConfigType(urn);
      return { changes: await diffConfig(deps, olds, news) };
    },

    async create(urn, inputs) {
      assertConfigType(urn);
      return { id: newConfigId(), outs: await applyConfig(deps, inputs) };
    },

    async update(_id, urn, _olds, news) {
      assertConfigType(urn);
      return { outs: await applyConfig(deps, news) };
    },

    async read(id, urn, props) {
      assertConfigType(urn);
      // An empty state means `pulumi import`: the id names the sections to pull.
      if (props && Object.keys(props).length > 0) return { id, props };
      const pulled = await pullConfigInputs(deps, parseImportId(id));
      return {
        id,
        props: pulled,
        inputs: { yaml: pulled.yaml } satisfies Properties,
      };
    },

    // A Config only describes a slice of the organization. Removing it from the
    // program stops managing that slice and leaves the organization unchanged.
    async delete() {},

    async invoke(token, args) {
      if (token !== GET_CONFIG_TOKEN) throw new Error(`Unknown function ${token}`);
      const resources = (args as { resources?: string[] }).resources ?? [];
      const { yaml } = await pullConfigInputs(deps, parseImportId(resources.join(',')));
      return { outputs: { yaml } };
    },
  };
}
