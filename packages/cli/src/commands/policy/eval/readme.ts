import { buildExamples } from '../../../lib/docgen/buildExamples.js';
import type { EvalCommandFlags } from './impl.js';

const examples = buildExamples<EvalCommandFlags>(
  ['policy', 'eval'],
  [
    {
      description: 'Permissions starter (bundle + envelope + workspace schemas)',
      flags: {
        package: 'data.permissions.purposes',
        input: 'transcend/policy/permissions-bundle/input.json',
        schema: 'transcend/policy/schemas',
      },
    },
    {
      description: 'Evaluate a generic decision query with a local envelope',
      flags: {
        package: 'data.example.result',
        input: './fixtures/envelope.json',
      },
    },
    {
      description: 'Pipe an envelope on stdin',
      flags: {
        package: 'data.example.result',
        'stdin-input': true,
      },
    },
  ],
);

export default `#### Examples

${examples}

Pass the bundle directory positionally (required — one bundle per invocation).

Permissions happy path (closest to production Evaluate — query + envelope + schemas):

\`\`\`sh
transcend policy eval transcend/policy/permissions-bundle \\
  --package=data.permissions.purposes \\
  --input=transcend/policy/permissions-bundle/input.json \\
  --schema=transcend/policy/schemas
\`\`\`

Generic example bundle:

\`\`\`sh
transcend policy eval transcend/policy/example-bundle \\
  --package=data.example.result \\
  --input=./fixtures/envelope.json
\`\`\`

Or pipe the envelope:

\`\`\`sh
cat ./fixtures/envelope.json | transcend policy eval transcend/policy/example-bundle \\
  --package=data.example.result \\
  --stdin-input
\`\`\`
`;
