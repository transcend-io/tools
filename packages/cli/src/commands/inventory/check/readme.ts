import { buildExamples } from '../../../lib/docgen/buildExamples.js';
import type { InventoryCheckCommandFlags } from './impl.js';

const examples = buildExamples<InventoryCheckCommandFlags>(
  ['inventory', 'check'],
  [
    {
      description: 'Check that ./transcend.yml matches the schema',
      flags: {},
    },
    {
      description: 'Check a file at a custom location',
      flags: {
        file: './custom/location.yml',
      },
    },
    {
      description: 'Run opt-in rules on consent sites',
      flags: {
        rules: 'consentSitesHaveOwners,consentSitesInDomains,uniqueConsentSiteHosts',
      },
    },
    {
      description: 'Run every rule in CI and read the result as JSON',
      flags: {
        rules: 'consentSitesHaveOwners,consentSitesInDomains,uniqueConsentSiteHosts,uniqueTrackers',
        json: true,
      },
    },
    {
      description: 'Fill in template variables, the same as inventory push',
      flags: {
        variables: 'domain:example.com',
      },
    },
  ],
);

export default `#### Examples

${examples}

By default \`check\` only decodes the file with the same codecs as \`inventory push\`. Decode errors
include the key path. Pass \`--rules\` to turn on more checks.

| Rule | What it checks |
| --- | --- |
| \`consentSitesHaveOwners\` | Every \`consent-sites\` row has a real owner or team. Empty lists and the placeholders UNASSIGNED, TBD, and TODO (any case) do not count. |
| \`consentSitesInDomains\` | Every \`consent-sites\` host is in \`consent-manager.domains\`. Case and a leading \`www.\` are ignored. Hosts with a port, such as \`localhost:5173\`, must match exactly. |
| \`uniqueConsentSiteHosts\` | No duplicate hosts in \`consent-sites\`. |
| \`uniqueTrackers\` | No duplicate \`data-flows\` (value and type) or \`cookies\` (name and isRegex). |

The command exits with code 1 when any error is found.
`;
