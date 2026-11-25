import { buildCommand } from '@stricli/core';

import { projectJsonParameter } from '../../../lib/scaffolding/command-parameters.js';

export const checkCommand = buildCommand({
  loader: async () => {
    const { check } = await import('./impl.js');
    return check;
  },
  parameters: {
    flags: {
      file: {
        kind: 'parsed',
        parse: String,
        brief: 'Path to the transcend.yml file to check',
        default: './transcend.yml',
      },
      rules: {
        kind: 'parsed',
        parse: String,
        brief:
          'Comma-separated opt-in rules to run: consentSitesHaveOwners, consentSitesInDomains, uniqueConsentSiteHosts, uniqueTrackers. By default only the schema check runs.',
        default: '',
      },
      variables: {
        kind: 'parsed',
        parse: String,
        brief:
          'Variables to template into the YAML file, the same as inventory push. Comma-separated list of key:value pairs.',
        default: '',
      },
      json: {
        ...projectJsonParameter,
        brief: 'Print the result as JSON on stdout',
      },
    },
  },
  docs: {
    brief: 'Validate a transcend.yml file without credentials',
    fullDescription:
      'Reads a transcend.yml the same way inventory push does and checks that it matches the schema. ' +
      'Pass --rules to also run opt-in rules. Exits non-zero when any error is found. ' +
      'No Transcend API key and no network access are needed.',
  },
});
