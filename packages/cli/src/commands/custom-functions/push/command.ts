import { buildCommand } from '@stricli/core';
import { ScopeName } from '@transcend-io/privacy-types';

import {
  createAuthParameter,
  createSombraAuthParameter,
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
      sombraAuth: createSombraAuthParameter(),
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
      skipTests: {
        kind: 'boolean',
        brief:
          'Skip test runs entirely, pushing functions without executing their test-payload files. Tests also do not run on --dryRun (nothing is signed on dry runs).',
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
          'Default Sombra gateway for functions whose manifest entry (or existing function) does not pin one. Each function is signed against the gateway it belongs to. Defaults to the primary Sombra of the organization.',
        optional: true,
      },
    },
  },
  docs: {
    brief: 'Create or update custom function code revisions from a manifest',
    fullDescription: `Sync custom function source code from your repository to Transcend.

Given a manifest file mapping custom function names to TypeScript source files (plus execution context like allowed hosts, timeout, and environment variables), this command:

1. Signs each function's code and context against your Sombra gateway's customer ingress (pass --sombraAuth when self-hosting Sombra)
2. Creates the DSR integration (data silo) for any new DSR function that does not specify a data-silo-id
3. Test-runs the freshly signed code with each of the entry's test payloads, when defined (unless --skipTests) — DSR functions can cover both their default (DATA_POINT) and enricher (REQUEST_ENRICHER) exports. Any failing payload rolls back any integration created in step 2
4. Creates any custom functions that do not exist yet (linking new DSR functions to their integration)
5. Pushes a new code revision for any function whose code or context changed
6. Promotes new revisions to active (unless --promote=false)

Functions with any failing test run are rejected — every failing payload's reason and execution logs are printed, nothing is pushed for that function, and the command exits 1. Functions without test payloads push as before, with a warning. Test runs require backend support for pre-signed code JWTs on the runCustomFunction mutation.

Functions whose code and context are unchanged are skipped, so this command is safe to run on every CI push.`,
  },
});
