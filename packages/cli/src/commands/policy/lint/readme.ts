import { buildExamples } from '../../../lib/docgen/buildExamples.js';
import type { LintCommandFlags } from './impl.js';

const examples = buildExamples<LintCommandFlags>(
  ['policy', 'lint'],
  [
    {
      description: 'Lint a local policy directory and optionally format Rego files',
      flags: {
        dir: './policies',
      },
    },
  ],
);

export default `#### Examples

${examples}
`;
