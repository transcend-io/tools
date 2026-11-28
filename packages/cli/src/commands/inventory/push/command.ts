import { buildCommand, numberParser } from '@stricli/core';
import { TranscendPullResource } from '@transcend-io/sdk';

import {
  createAuthParameter,
  createTranscendUrlParameter,
} from '../../../lib/cli/common-parameters.js';
import {
  projectDryRunParameter,
  projectJsonParameter,
  projectYesParameter,
} from '../../../lib/scaffolding/command-parameters.js';

export const pushCommand = buildCommand({
  loader: async () => {
    const { push } = await import('./impl.js');
    return push;
  },
  parameters: {
    flags: {
      auth: createAuthParameter({
        scopes: 'Varies',
      }),
      file: {
        kind: 'parsed',
        parse: String,
        brief: 'Path to the YAML file to push from',
        default: './transcend.yml',
      },
      transcendUrl: createTranscendUrlParameter(),
      pageSize: {
        kind: 'parsed',
        parse: numberParser,
        brief: 'The page size to use when paginating over the API',
        default: '50',
      },
      variables: {
        kind: 'parsed',
        parse: String,
        brief:
          'Variables to template into the YAML file when pushing configuration. Comma-separated list of key:value pairs.',
        default: '',
      },
      publishToPrivacyCenter: {
        kind: 'boolean',
        brief: 'When true, publish the configuration to the Privacy Center',
        default: false,
      },
      classifyService: {
        kind: 'boolean',
        brief:
          'When true, automatically assign the service for a data flow based on the domain that is specified',
        default: false,
      },
      deleteExtraAttributeValues: {
        kind: 'boolean',
        brief:
          'When true and syncing attributes, delete any extra attributes instead of just upserting',
        default: false,
      },
      dryRun: {
        ...projectDryRunParameter,
        brief:
          'Show what the push would create, update, or delete without changing anything in Transcend',
      },
      json: {
        ...projectJsonParameter,
        brief: 'With --dryRun, print the plan as JSON on stdout',
      },
      yes: {
        ...projectYesParameter,
        brief: 'Apply the push after showing the preview without asking for confirmation',
      },
      skipPreview: {
        kind: 'boolean',
        brief:
          'Push straight away without comparing with your organization first. This is how push worked before previews.',
        default: false,
      },
      expectBundleId: {
        kind: 'parsed',
        parse: String,
        brief:
          'Stop before anything is previewed or pushed unless the consent manager bundle id of the organization matches this id. Protects CI from using the API key of the wrong organization. Cannot be used with a list of API keys.',
        optional: true,
      },
      resources: {
        kind: 'enum',
        values: Object.values(TranscendPullResource),
        brief:
          'Push only these top-level sections of the YAML file, using the same names as `inventory pull --resources`. Every other section is ignored by the preview and the push.',
        variadic: ',',
        optional: true,
      },
    },
  },
  docs: {
    brief: 'Push metadata from transcend.yml to Transcend',
    fullDescription:
      'Given a transcend.yml file, sync the contents up to your Transcend instance. Before anything is written, the command compares your file with your organization, shows what will be created, updated, or deleted, and asks you to confirm. Pass --yes to confirm automatically (for example in CI), --dryRun to only look, or --skipPreview to push without a preview. Use --resources to push only some sections of the file, and --expectBundleId to stop when the API key belongs to the wrong organization.',
  },
});
