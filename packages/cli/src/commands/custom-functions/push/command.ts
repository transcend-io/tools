import { buildCommand } from '@stricli/core';
import { ScopeName } from '@transcend-io/privacy-types';

import {
  createAuthParameter,
  createTranscendUrlParameter,
} from '../../../lib/cli/common-parameters.js';
import { uuidParser } from '../../../lib/cli/parsers.js';

export const pushCommand = buildCommand({
  loader: async () => {
    const { push } = await import('./impl.js');
    return push;
  },
  parameters: {
    flags: {
      auth: createAuthParameter({
        scopes: [ScopeName.ManageDataMap],
      }),
      transcendUrl: createTranscendUrlParameter(),
      file: {
        kind: 'parsed',
        parse: String,
        brief: 'Path to the custom functions manifest YAML file',
        default: './transcend-functions.yml',
      },
      variables: {
        kind: 'parsed',
        parse: String,
        brief:
          'The variables to template into the manifest file (e.g. secret env values). Comma-separated list of key:value pairs.',
        default: '',
      },
      dryRun: {
        kind: 'boolean',
        brief: 'When true, report what would change without pushing anything',
        default: false,
      },
      promote: {
        kind: 'boolean',
        brief:
          'When true, promote new revisions to active. Set to false to leave new revisions as drafts for review in the dashboard.',
        default: true,
      },
      force: {
        kind: 'boolean',
        brief:
          'Push a new revision even when no changes are detected. Useful when only environment variable values changed, which cannot be diffed.',
        default: false,
      },
      updateManifest: {
        kind: 'boolean',
        brief:
          'After pushing, write the assigned custom function IDs back into the manifest file so future pushes match by ID instead of by name. Comments and <<parameters.x>> placeholders are preserved.',
        default: false,
      },
      sombraId: {
        kind: 'parsed',
        parse: uuidParser,
        brief:
          'The Sombra gateway to sign code against and attach new GENERAL functions to. Defaults to the primary Sombra of the organization.',
        optional: true,
      },
    },
  },
  docs: {
    brief: 'Create or update custom function code revisions from a manifest',
    fullDescription: `Sync custom function source code from your repository to Transcend.

Given a manifest file mapping custom function names to TypeScript source files (plus execution context like allowed hosts, timeout, and environment variables), this command:

1. Exchanges your API key for a short-lived Sombra signing session
2. Creates any custom functions that do not exist yet
3. Pushes a new code revision for any function whose code or context changed
4. Promotes new revisions to active (unless --promote=false)

Functions whose code and context are unchanged are skipped, so this command is safe to run on every CI push.`,
  },
});
