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
    {
      description: 'Test a single local publish directory',
      positionals: ['transcend/policy/example-bundle'],
      flags: {},
    },
  ],
);

export default `#### Examples

${examples}

With no directory argument, \`policy test\` runs every immediate child under the default workspace
(\`transcend/policy\`) that contains a \`.manifest\`. Pass one bundle path to test a single unit.
`;
