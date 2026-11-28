import { buildExamples } from '../../../lib/docgen/buildExamples.js';
import type { CustomFunctionsPullCommandFlags } from './impl.js';

const examples = buildExamples<CustomFunctionsPullCommandFlags>(
  ['custom-functions', 'pull'],
  [
    {
      description:
        'Pull all custom functions into transcend/custom-functions/transcend-functions.yml',
      flags: {
        auth: '$TRANSCEND_API_KEY',
      },
    },
    {
      description: 'Refresh functions already in the manifest with the latest code from the org',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        force: true,
      },
    },
    {
      description: 'Back up an organization, keeping its IDs so push updates the same functions',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        includeIds: true,
      },
    },
  ],
);

export default `#### Copying functions into another organization

\`pull\` is the reverse of \`push\`. Pull from the source organization, then push with an API key for the target organization:

\`\`\`sh
transcend custom-functions pull --auth=$SOURCE_API_KEY
transcend custom-functions push --auth=$TARGET_API_KEY --variables=CRM_API_KEY:value
\`\`\`

By default, pulled entries leave out \`id\`, \`data-silo-id\`, and \`sombra-id\`, so \`push\` matches by name in the target organization. New DSR functions get their DSR integration created on push. Pass \`--includeIds\` only when you push back into the same organization.

Env values are encrypted by Sombra and cannot be pulled. Each env key is written as a \`<<parameters.NAME>>\` placeholder, so \`push\` fails until you pass the value with \`--variables\`.

#### Merging into an existing project

\`pull\` merges into an existing manifest, such as one created by \`init\`. Functions not yet in the manifest are appended. Functions already in the manifest, matched by \`id\` and then by name, are left alone unless you pass \`--force\`. With \`--force\`, their source file, description, type, allowed hosts, timeout, and third-party import setting are refreshed. Their IDs, env values, and test payloads are kept.

#### Examples

${examples}
`;
