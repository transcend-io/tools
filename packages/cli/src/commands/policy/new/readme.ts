import { buildExamples } from '../../../lib/docgen/buildExamples.js';
import type { PolicyNewFlags } from './impl.js';

const examples = buildExamples<PolicyNewFlags>(
  ['policy', 'new'],
  [
    {
      description: 'Add a generic example bundle',
      flags: {
        template: 'generic',
        name: 'example',
        yes: true,
      },
    },
    {
      description: 'Add a permissions bundle',
      flags: {
        template: 'permissions',
        name: 'permissions',
        yes: true,
      },
    },
    {
      description: 'Custom local folder, same package root',
      flags: {
        template: 'permissions',
        name: 'permissions',
        'bundle-dir': 'my-bundle',
        yes: true,
      },
    },
    {
      description: 'Preview without writing',
      flags: {
        template: 'generic',
        name: 'myapp',
        dryRun: true,
        json: true,
      },
    },
  ],
);

export default `#### Examples

${examples}

Requires an initialized workspace (\`transcend policy init\` first). Naming triad:

- \`--name\` — Rego / \`.manifest\` package root (default local folder: \`{name}-bundle/\`)
- \`--bundle-dir\` — local publish directory basename under the workspace only
- \`--bundle-name\` (on \`policy publish\`) — remote Policy Engine name; unrelated to the local folder

The positional argument is the **workspace** (default \`transcend/policy\`).
`;
