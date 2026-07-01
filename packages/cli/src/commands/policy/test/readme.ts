import { buildExamples } from '../../../lib/docgen/buildExamples.js';
import type { TestCommandFlags } from './impl.js';

const examples = buildExamples<TestCommandFlags>(
  ['policy', 'test'],
  [
    {
      description: 'Run tests in a local policy directory',
      flags: {
        dir: './policies',
      },
    },
  ],
);

export default `#### Examples

${examples}
`;
