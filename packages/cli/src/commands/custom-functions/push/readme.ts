import { buildExamples } from '../../../lib/docgen/buildExamples.js';
import type { CustomFunctionsPushCommandFlags } from './impl.js';

const examples = buildExamples<CustomFunctionsPushCommandFlags>(
  ['custom-functions', 'push'],
  [
    {
      description: 'Push all custom functions defined in ./transcend-functions.yml',
      flags: {
        auth: '$TRANSCEND_API_KEY',
      },
    },
    {
      description: 'Preview changes without pushing anything',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        dryRun: true,
      },
    },
    {
      description: 'Use a manifest at a custom path with templated secrets',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        file: './transcend/functions.yml',
        variables: 'crmApiKey:example-secret-value',
      },
    },
    {
      description: 'Push new revisions as drafts for review instead of promoting them',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        promote: false,
      },
    },
    {
      description:
        'Record the assigned custom function IDs in the manifest so future pushes match by ID',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        updateManifest: true,
      },
    },
    {
      description:
        'Force a new revision even when no code changes are detected (e.g. env value rotation)',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        force: true,
      },
    },
    {
      description: 'With Sombra authentication, needed when self-hosting Sombra',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        sombraAuth: '$SOMBRA_INTERNAL_KEY',
      },
    },
    {
      description: 'Specifying the backend URL, needed for US hosted backend infrastructure',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        transcendUrl: 'https://api.us.transcend.io',
      },
    },
  ],
);

export default `#### Manifest file

The manifest maps custom function names to source files in your repository:

\`\`\`yaml
# transcend-functions.yml
functions:
  - name: Score Lead
    code: ./functions/score-lead.ts
    description: Scores an inbound lead against the CRM
    allowed-hosts:
      - api.example.com
    timeout-ms: 30000
    env:
      CRM_API_KEY: <<parameters.crmApiKey>>
  - name: DSR Lookup
    code: ./functions/dsr-lookup.ts
    type: DSR
    data-silo-id: 5a4b0f9c-xxxx-xxxx-xxxx-xxxxxxxxxxxx
\`\`\`

| Field | Required | Description |
| --- | --- | --- |
| \`name\` | Yes | Display name of the function. Used as the sync key when no \`id\` is set — renaming an id-less entry creates a new function. |
| \`code\` | Yes | Path to the TypeScript source file, relative to the manifest. |
| \`id\` | No | Custom function ID. When set, it becomes the sync key (allowing renames and disambiguating non-unique names). Find IDs via \`transcend custom-functions list\`, or let \`--updateManifest\` fill them in after a push. |
| \`description\` | No | Description shown in the Transcend dashboard. |
| \`type\` | No | \`GENERAL\` (default) or \`DSR\`. DSR functions require \`data-silo-id\`. |
| \`data-silo-id\` | DSR only | The data silo the DSR function is attached to. |
| \`sombra-id\` | No | The Sombra gateway the function belongs to. Each function's code is signed against its own gateway; when omitted, the existing function's gateway (or \`--sombraId\`, or the primary Sombra) is used. An entry cannot move an existing function to a different gateway. |
| \`allowed-hosts\` | No | Hosts the function may make network requests to. |
| \`timeout-ms\` | No | Execution timeout in milliseconds. |
| \`allow-third-party-imports\` | No | Whether the function may import third party modules. |
| \`env\` | No | Environment variables exposed to the function. Use \`<<parameters.name>>\` placeholders with the \`--variables\` flag to avoid committing secrets. |

Note: environment variable values are encrypted by Sombra and cannot be diffed. When only an env value changes, use \`--force\` to push a new revision.

Functions may belong to different Sombra gateways within one manifest; the command connects to each distinct gateway as needed. A single \`--sombraAuth\` internal key is applied to every gateway, so self-hosted gateways with *different* internal keys require one push per gateway.

#### How manifest entries are matched to existing functions

Each entry is resolved against the custom functions in your organization in this order:

1. **By \`id\`, when set.** The ID is the sync key: the matched function is updated, and \`name\` may be changed freely (it just renames the function). If no function with that ID exists, the push **fails** for that entry — a stale or mistyped ID never silently creates a duplicate. Remove the \`id\` to create a new function instead.
2. **By exact \`name\`, when no \`id\` is set.**
   - Exactly one function with that name → it is updated.
   - No function with that name → a new one is created.
   - **More than one** function with that name → the push fails with an error listing the candidate IDs. Add the right \`id\` to the entry to disambiguate, or grab IDs from \`transcend custom-functions list\`.

Within the manifest itself, duplicate \`id\`s are always rejected, and duplicate \`name\`s are only allowed when every entry sharing the name has an \`id\`.

Because ID matching is strictly safer, prefer pinning IDs once functions exist: run \`transcend custom-functions push --updateManifest\` after the first push and the assigned IDs are written back into the manifest automatically (comments and \`<<parameters.x>>\` placeholders are preserved).

#### Examples

${examples}
`;
