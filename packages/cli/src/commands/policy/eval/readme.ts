import { buildExamples } from '../../../lib/docgen/buildExamples.js';
import type { EvalCommandFlags } from './impl.js';

const examples = buildExamples<EvalCommandFlags>(
  ['policy', 'eval'],
  [
    {
      description: 'Evaluate a decision query with a local envelope',
      flags: {
        package: 'data.example.result',
        input: './fixtures/envelope.json',
      },
    },
    {
      description: 'Emit JSON and attach workspace schemas',
      flags: {
        package: 'data.example.result',
        input: './fixtures/envelope.json',
        format: 'json',
        schema: 'transcend/policy/schemas',
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

Pass the bundle directory positionally (required — one bundle per invocation):

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
