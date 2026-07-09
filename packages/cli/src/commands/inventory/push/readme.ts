import { ScopeName, TRANSCEND_SCOPES } from '@transcend-io/privacy-types';

import { TR_PUSH_RESOURCE_SCOPE_MAP } from '../../../constants.js';
import { TranscendPullResource } from '../../../enums.js';
import { buildExampleCommand, buildExamples } from '../../../lib/docgen/buildExamples.js';
import { createPullResourceScopesTable } from '../../../lib/docgen/createPullResourceScopesTable.js';
import type { GenerateApiKeysCommandFlags } from '../../admin/generate-api-keys/impl.js';
import type { PullCommandFlags } from '../pull/impl.js';
import type { PushCommandFlags } from './impl.js';

const examples = buildExamples<PushCommandFlags>(
  ['inventory', 'push'],
  [
    {
      description: 'Looks for file at ./transcend.yml',
      flags: {
        auth: '$TRANSCEND_API_KEY',
      },
    },
    {
      description: 'Looks for file at custom location ./custom/location.yml',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        file: './custom/location.yml',
      },
    },
    {
      description: 'Apply service classifier to all data flows',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        classifyService: true,
      },
    },
    {
      description:
        'Push up attributes, deleting any attributes that are not specified in the transcend.yml file',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        deleteExtraAttributeValues: true,
      },
    },
    {
      description:
        'Use dynamic variables to fill out parameters in YAML files (see [./examples/multi-instance.yml](./examples/multi-instance.yml))',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        variables: 'domain:acme.com,stage:staging',
      },
    },
  ],
);

export default `#### Scopes

The API key permissions for this command vary based on the resources declared as top-level keys in your [\`transcend.yml\`](#transcendyml) file:

${createPullResourceScopesTable(TR_PUSH_RESOURCE_SCOPE_MAP)}

#### Examples

${examples}

**Push a single .yml file configuration into multiple Transcend instances**

This uses the output of [\`transcend admin generate-api-keys\`](#transcend-admin-generate-api-keys).

\`\`\`sh
${buildExampleCommand<GenerateApiKeysCommandFlags>(['admin', 'generate-api-keys'], {
  email: 'test@transcend.io',
  password: '$TRANSCEND_PASSWORD',
  scopes: [
    TRANSCEND_SCOPES[ScopeName.ViewEmailTemplates].title,
    TRANSCEND_SCOPES[ScopeName.ViewDataMap].title,
  ],
  apiKeyTitle: 'CLI Usage Cross Instance Sync',
  file: './transcend-api-keys.json',
})}
${buildExampleCommand<PullCommandFlags>(['inventory', 'pull'], {
  auth: '$TRANSCEND_API_KEY',
})}
${buildExampleCommand<PushCommandFlags>(['inventory', 'push'], {
  auth: './transcend-api-keys.json',
})}
\`\`\`

**Push multiple .yml file configurations into multiple Transcend instances**

This uses the output of [\`transcend admin generate-api-keys\`](#transcend-admin-generate-api-keys).

\`\`\`sh
${buildExampleCommand<GenerateApiKeysCommandFlags>(['admin', 'generate-api-keys'], {
  email: 'test@transcend.io',
  password: '$TRANSCEND_PASSWORD',
  scopes: [
    TRANSCEND_SCOPES[ScopeName.ViewEmailTemplates].title,
    TRANSCEND_SCOPES[ScopeName.ViewDataMap].title,
  ],
  apiKeyTitle: 'CLI Usage Cross Instance Sync',
  file: './transcend-api-keys.json',
})}
${buildExampleCommand<PullCommandFlags>(['inventory', 'pull'], {
  auth: './transcend-api-keys.json',
  file: './transcend/',
})}
# <edit .yml files in folder in between these steps>
${buildExampleCommand<PushCommandFlags>(['inventory', 'push'], {
  auth: './transcend-api-keys.json',
  file: './transcend/',
})}
\`\`\`

**Apply service classifier to all data flows**

\`\`\`sh
${buildExampleCommand<PullCommandFlags>(['inventory', 'pull'], {
  auth: '$TRANSCEND_API_KEY',
  resources: [TranscendPullResource.DataFlows],
})}
${buildExampleCommand<PushCommandFlags>(['inventory', 'push'], {
  auth: '$TRANSCEND_API_KEY',
  classifyService: true,
})}
\`\`\`

**Push up attributes, deleting any attributes that are not specified in the transcend.yml file**

\`\`\`sh
${buildExampleCommand<PullCommandFlags>(['inventory', 'pull'], {
  auth: '$TRANSCEND_API_KEY',
  resources: [TranscendPullResource.Attributes],
})}
${buildExampleCommand<PushCommandFlags>(['inventory', 'push'], {
  auth: '$TRANSCEND_API_KEY',
  deleteExtraAttributeValues: true,
})}
\`\`\`

Some things to note about this sync process:

1. Any field that is defined in your .yml file will be synced up to app.transcend.io. If any change was made on the Admin Dashboard, it will be overwritten.
2. If you omit a field from the .yml file, this field will not be synced. This gives you the ability to define as much or as little configuration in your transcend.yml file as you would like, and let the remainder of fields be labeled through the Admin Dashboard
3. If you define new data subjects, identifiers, data silos or datapoints that were not previously defined on the Admin Dashboard, the CLI will create these new resources automatically.
4. Currently, this CLI does not handle deleting or renaming of resources. If you need to delete or rename a data silo, identifier, enricher or API key, you should make the change on the Admin Dashboard.
5. The only resources that this CLI will not auto-generate are:

- a) Data silo owners: If you assign an email address to a data silo, you must first make sure that user is invited into your Transcend instance (https://app.transcend.io/admin/users).
- b) API keys: This CLI will not create new API keys. You will need to first create the new API keys on the Admin Dashboard (https://app.transcend.io/infrastructure/api-keys). You can then list out the titles of the API keys that you generated in your transcend.yml file, after which the CLI is capable of updating that API key to be able to respond to different data silos in your Data Map

#### Workflow configs push notes

\`workflow-configs\` are matched using a cascading key:

1. \`internal-name\` (when provided; zero matches create a new workflow instead of falling through)
2. \`title\`
3. \`action-type\`
4. \`data-subject-type\` (when provided in YAML)
5. \`region-list\` (order-independent set match)

- **Create:** If no workflow matches after the cascade, the CLI creates a DSR workflow via \`createWorkflow\` (starts as Draft with default associations), then applies the remaining YAML fields via \`updateWorkflowConfig\`.
- **Update:** If a unique match exists, fields from YAML are updated in place. When \`internal-name\` is provided on update, it is written back via \`updateWorkflowConfig\`.
- Preference-management workflows are not supported — manage those in the [Admin Dashboard](https://app.transcend.io/privacy-requests/workflows).
- Publishing (\`visibility: PUBLISHED\`) requires a \`data-subject-type\`.

#### Preference management push notes

When pushing \`purposes\`, \`preference-options\`, or nested \`preference-topics\`:

- **Slug format:** Preference topic and option value slugs must match \`/^[A-Za-z]+$/\` (alphabetical letters only — no digits, dashes, or underscores). The CLI validates this before any API calls. Topic slugs are normalized to PascalCase server-side, so YAML slugs should already be PascalCase or matching will break on subsequent pulls.
- **Built-in purposes:** Default purposes (Advertising, Analytics, Essential, Functional, SaleOfInfo) can be updated via API key for most fields (\`description\`, \`title\`, \`display-order\`, \`show-in-privacy-center\`, \`auth-level\`, etc.). The CLI omits \`configurable\` and \`show-in-consent-manager\` from updates for built-in purposes and logs a warning if your YAML differs on those fields — change them in the [Admin Dashboard](https://app.transcend.io/consent-manager/regional-experiences/purposes) instead.
- **BOOLEAN topics:** Do not define \`options\` for \`BOOLEAN\` preference topics — the backend auto-creates True/False options. The CLI rejects non-empty options before push.
- **Immutable topic fields:** Slug, type, and parent purpose cannot be changed for an existing preference topic. Attempting to change \`type\` in YAML is rejected by the CLI.

#### Consent workflow triggers push notes

When pushing \`consent-workflow-triggers\`:

- **Purposes required:** Each trigger needs a non-empty \`purposes\` list. The CLI derives \`triggerCondition\` from purposes on push (same shape as the Admin Dashboard).
- **Exactly one mode:** Use either legacy fields (\`action-type\`, optional \`data-silo-titles\`) **or** Workflows V2 (\`workflow-title\`). Do not mix them on the same trigger.
- **Legacy:** \`action-type\` and \`data-subject-type\` are required when creating a new trigger. \`data-silo-titles\` must match existing data silo titles exactly.
- **Workflows V2:** \`workflow-title\` must match a DSR workflow's \`internalName\` (when set) or external title. On create, \`actionId\` / \`dataSubjectId\` are taken from that workflow. Requires the Manage Workflows scope to list workflows.
- **Example:** See [consent-workflow-triggers.yml](../../../../examples/consent-workflow-triggers.yml).

#### CI Integration

Once you have a workflow for creating your transcend.yml file, you will want to integrate your \`transcend inventory push\` command on your CI.

Below is an example of how to set this up using a Github action:

\`\`\`yaml
name: Transcend Data Map Syncing
# See https://app.transcend.io/infrastructure/integrations

on:
  push:
    branches:
      - 'main'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - name: Setup Node.js
        uses: actions/setup-node@v6

      - name: Install Transcend CLI
        run: npm install --global @transcend-io/cli

      # If you have a script that generates your transcend.yml file from
      # an ORM or infrastructure configuration, add that step here
      # Leave this step commented out if you want to manage your transcend.yml manually
      # - name: Generate transcend.yml
      #   run: ./scripts/generate_transcend_yml.py

      - name: Push Transcend config
        run: transcend inventory push --auth=\${{ secrets.TRANSCEND_API_KEY }}
\`\`\`

#### Dynamic Variables

If you are using this CLI to sync your Data Map between multiple Transcend instances, you may find the need to make minor modifications to your configurations between environments. The most notable difference would be the domain where your webhook URLs are hosted on.

The \`transcend inventory push\` command takes in a parameter \`variables\`. This is a CSV of \`key:value\` pairs.

This command could fill out multiple parameters in a YAML file like [./examples/multi-instance.yml](./examples/multi-instance.yml), copied below:

\`\`\`yml
api-keys:
  - title: Webhook Key
enrichers:
  - title: Basic Identity Enrichment
    description: Enrich an email address to the userId and phone number
    # The data silo webhook URL is the same in each environment,
    # except for the base domain in the webhook URL.
    url: https://example.<<parameters.domain>>/transcend-enrichment-webhook
    input-identifier: email
    output-identifiers:
      - userId
      - phone
      - myUniqueIdentifier
  - title: Fraud Check
    description: Ensure the email address is not marked as fraudulent
    url: https://example.<<parameters.domain>>/transcend-fraud-check
    input-identifier: email
    output-identifiers:
      - email
    privacy-actions:
      - ERASURE
data-silos:
  - title: Redshift Data Warehouse
    integrationName: server
    description: The mega-warehouse that contains a copy over all SQL backed databases - <<parameters.stage>>
    url: https://example.<<parameters.domain>>/transcend-webhook
    api-key-title: Webhook Key
\`\`\`
`;
