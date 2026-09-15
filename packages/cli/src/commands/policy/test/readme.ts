import { buildExamples } from '../../../lib/docgen/buildExamples.js';
import type { TestCommandFlags } from './impl.js';

const examples = buildExamples<TestCommandFlags>(
  ['policy', 'test'],
  [
    {
      description: 'Run tests for every bundle under the default workspace',
      flags: {},
    },
    {
      description: 'Filter tests and emit JSON',
      flags: {
        format: 'json',
        run: 'test_allows',
        verbose: true,
      },
    },
    {
      description: 'Fail CI when coverage is below a threshold',
      flags: {
        coverage: true,
        threshold: '80',
      },
    },
  ],
);

export default `#### Examples

${examples}

Pass one bundle directory to test a single unit:

\`\`\`sh
transcend policy test transcend/policy/example-bundle
\`\`\`
`;
