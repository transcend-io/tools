import { buildExamples } from '../../../lib/docgen/buildExamples.js';
import type { EvalCommandFlags } from './impl.js';

const examples = buildExamples<EvalCommandFlags>(
  ['policy', 'eval'],
  [
    {
      description: 'Evaluate a decision query with a local envelope',
      flags: {
        pkg: 'data.transcend.decision',
        input: './fixtures/envelope.json',
      },
    },
  ],
);

export default `#### Examples

${examples}

The default project is \`transcend/policy\`. Pass another project directory positionally:

\`\`\`sh
transcend policy eval ./policies --pkg=data.transcend.decision --input=./fixtures/envelope.json
\`\`\`
`;
