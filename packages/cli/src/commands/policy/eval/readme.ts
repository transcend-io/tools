import { buildExamples } from '../../../lib/docgen/buildExamples.js';
import type { EvalCommandFlags } from './impl.js';

const examples = buildExamples<EvalCommandFlags>(
  ['policy', 'eval'],
  [
    {
      description: 'Evaluate a decision query with a local envelope',
      flags: {
        pkg: 'data.example.result',
        input: './fixtures/envelope.json',
      },
    },
  ],
);

export default `#### Examples

${examples}

Pass the bundle directory positionally (required — one bundle per invocation):

\`\`\`sh
transcend policy eval transcend/policy/example-bundle \\
  --pkg=data.example.result \\
  --input=./fixtures/envelope.json
\`\`\`
`;
