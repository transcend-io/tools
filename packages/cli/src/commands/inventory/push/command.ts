import { buildCommand, numberParser } from '@stricli/core';

import {
  createAuthParameter,
  createTranscendUrlParameter,
} from '../../../lib/cli/common-parameters.js';
import {
  projectDryRunParameter,
  projectJsonParameter,
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
    },
  },
  docs: {
    brief: 'Push metadata from transcend.yml to Transcend',
    fullDescription: 'Given a transcend.yml file, sync the contents up to your Transcend instance.',
  },
});
