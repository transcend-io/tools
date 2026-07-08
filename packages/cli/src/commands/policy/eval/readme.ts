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
        bundle: './policies',
      },
    },
  ],
);

export default `#### Examples

${examples}
`;
