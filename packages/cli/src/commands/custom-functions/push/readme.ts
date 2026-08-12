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
      description: 'Push without running test payloads',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        skipTests: true,
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
    test-payload: ./test-payloads/score-lead.json
    allowed-hosts:
      - api.example.com
    timeout-ms: 30000
    env:
      CRM_API_KEY: <<parameters.crmApiKey>>
  - name: DSR Lookup
    code: ./functions/dsr-lookup.ts
    type: DSR
    data-silo-id: 5a4b0f9c-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    test-payload: ./test-payloads/dsr-lookup.json
    test-payload-type: REQUEST_ENRICHER
\`\`\`

| Field | Required | Description |
| --- | --- | --- |
| \`name\` | Yes | Display name of the function. Used as the sync key when no \`id\` is set — renaming an id-less entry creates a new function. |
| \`code\` | Yes | Path to the TypeScript source file, relative to the manifest. |
| \`id\` | No | Custom function ID. When set, it becomes the sync key (allowing renames and disambiguating non-unique names). Find IDs via \`transcend custom-functions list\`, or let \`--updateManifest\` fill them in after a push. |
| \`description\` | No | Description shown in the Transcend dashboard. |
| \`type\` | No | \`GENERAL\` (default) or \`DSR\`. |
| \`data-silo-id\` | DSR only | The data silo (DSR integration) the DSR function is attached to. When omitted for a **new** DSR function, the integration is created automatically (see below) and \`--updateManifest\` writes the assigned ID back. |
| \`sombra-id\` | No | The Sombra gateway the function belongs to. Each function's code is signed against its own gateway; when omitted, the existing function's gateway (or \`--sombraId\`, or the primary Sombra) is used. An entry cannot move an existing function to a different gateway. |
| \`sombra-auth-env\` | No | Name of the environment variable holding the internal key of the function's Sombra gateway (e.g. \`SOMBRA_EU_INTERNAL_KEY\`). The key itself never lives in the manifest — it is read from the environment at push time. Overrides \`--sombraAuth\` for this entry. |
| \`test-payload\` | No | Path to a JSON file (relative to the manifest) with the payload to test-run the function with before pushing. When set, the freshly signed code is executed on your Sombra gateway as a test run, and the push is rejected if the run errors or exits non-zero. |
| \`test-payload-type\` | No | For DSR functions, which export the test run invokes: \`DATA_POINT\` (default) invokes the default export, \`REQUEST_ENRICHER\` invokes the \`enricher\` export. Ignored for GENERAL functions. |
| \`allowed-hosts\` | No | Hosts the function may make network requests to. |
| \`timeout-ms\` | No | Execution timeout in milliseconds. |
| \`allow-third-party-imports\` | No | Whether the function may import third party modules. |
| \`env\` | No | Environment variables exposed to the function. Use \`<<parameters.name>>\` placeholders with the \`--variables\` flag to avoid committing secrets. |

Note: environment variable values are encrypted by Sombra and cannot be diffed. When only an env value changes, use \`--force\` to push a new revision.

Functions may belong to different Sombra gateways within one manifest; the command connects to each distinct gateway as needed. \`--sombraAuth\` provides the default internal key; when self-hosted gateways use *different* internal keys, set \`sombra-auth-env\` per entry to the name of the environment variable holding that gateway's key:

\`\`\`yaml
functions:
  - name: US Function
    code: ./functions/us.ts
    # primary gateway, authenticated by --sombraAuth (if self-hosted)
  - name: EU Function
    code: ./functions/eu.ts
    sombra-id: 8c0b1f2a-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    sombra-auth-env: SOMBRA_EU_INTERNAL_KEY
\`\`\`

#### How manifest entries are matched to existing functions

Each entry is resolved against the custom functions in your organization in this order:

1. **By \`id\`, when set.** The ID is the sync key: the matched function is updated, and \`name\` may be changed freely (it just renames the function). If no function with that ID exists, the push **fails** for that entry — a stale or mistyped ID never silently creates a duplicate. Remove the \`id\` to create a new function instead.
2. **By exact \`name\`, when no \`id\` is set.**
   - Exactly one function with that name → it is updated.
   - No function with that name → a new one is created.
   - **More than one** function with that name → the push fails with an error listing the candidate IDs. Add the right \`id\` to the entry to disambiguate, or grab IDs from \`transcend custom-functions list\`.

Within the manifest itself, duplicate \`id\`s are always rejected, and duplicate \`name\`s are only allowed when every entry sharing the name has an \`id\`.

Because ID matching is strictly safer, prefer pinning IDs once functions exist: run \`transcend custom-functions push --updateManifest\` after the first push and the assigned IDs are written back into the manifest automatically (comments and \`<<parameters.x>>\` placeholders are preserved). For DSR functions, the assigned \`data-silo-id\` is written back the same way.

#### New DSR functions: the integration is created automatically

A **new** DSR entry (no \`id\`, no matching function by name) that omits \`data-silo-id\` gets its DSR integration created as part of the push:

1. A \`customFunction\`-catalog data silo is created, titled after the function, on the entry's Sombra gateway (\`sombra-id\`, else \`--sombraId\`, else the organization's primary Sombra). It starts \`NOT_CONFIGURED\` with nothing attached.
2. The signed code is test-run against that silo (when a \`test-payload\` is set) — DSR test payloads always get \`extras.dataSilo\` injected from the resolved silo, so payload files never need to hardcode silo IDs.
3. On a passing test the custom function is created and linked to the silo (which becomes \`Connected\`). On a failing test the silo is **rolled back** (deleted) and the function is rejected.
4. With \`--updateManifest\`, both the custom function \`id\` and the \`data-silo-id\` are written back into the manifest.

DSR entries that already pin a \`data-silo-id\` behave as before — the integration must exist and the function is attached to it.

#### Test-before-promote

Entries with a \`test-payload\` are tested before anything is pushed:

1. The code and context are signed against the function's Sombra gateway.
2. The signed code is executed as a test run with the payload JSON (via the \`runCustomFunction\` mutation — nothing is persisted). GENERAL functions run on the function's gateway; DSR functions run on the gateway of the function's data silo — \`extras.dataSilo\` is injected into the payload automatically from the entry's resolved silo, so payload files never need to hardcode silo IDs.
3. **Pass** (no error, exit code ≤ 0): the revision is pushed and promoted as usual.
4. **Fail**: the function is rejected — the failure reason and the run's logs are printed, nothing is pushed for that function, and the command exits 1.

Entries without a \`test-payload\` push as before, with a warning. \`--skipTests\` bypasses testing entirely, and \`--dryRun\` never tests (nothing is signed on dry runs). Test runs require backend support for pre-signed code JWTs on the \`runCustomFunction\` mutation; on older backends the push fails with an upgrade hint — use \`--skipTests\` to bypass.

#### Examples

${examples}
`;
