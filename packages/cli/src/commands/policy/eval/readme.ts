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

The default publish directory is \`transcend/policy/example-bundle\`. Pass another \`{root}-bundle/\` directory positionally:

\`\`\`sh
transcend policy eval ./policies/example-bundle --pkg=data.example.result --input=./fixtures/envelope.json
\`\`\`
`;
