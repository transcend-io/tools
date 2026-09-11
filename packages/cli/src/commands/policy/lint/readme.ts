import { buildExamples } from '../../../lib/docgen/buildExamples.js';
import type { LintCommandFlags } from './impl.js';

const examples = buildExamples<LintCommandFlags>(
  ['policy', 'lint'],
  [
    {
      description: 'Verify the default local policy project',
      flags: {},
    },
    {
      description: 'Verify and format a custom policy project',
      flags: {
        dir: './policies',
        fix: true,
      },
    },
    {
      description: 'Run the verification gate in CI or an editor',
      flags: {
        noInteractive: true,
        json: true,
      },
    },
  ],
);

export default `#### Examples

${examples}
`;
